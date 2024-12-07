<?php
/**
 * Plugin Name: Prompt Fox!
 * Description: Adds a custom REST API endpoint to save text strings.
 * Version: 1.0
 * Author: sethshoultes
 */

if (!defined('ABSPATH')) {
    exit;
}

// Debug logging function
function pf_log($message, $data = null) {
    if (WP_DEBUG === true) {
        $log = 'Prompt Fox Debug: ' . $message;
        if ($data !== null) {
            $log .= ' | ' . print_r($data, true);
        }
        error_log($log);
    }
}

// Get authentication header from various sources
function pf_get_auth_header() {
    $headers = null;
    
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    
    return $headers;
}

// Application Password Authentication
function pf_authenticate_request($user) {
    // Skip if not a REST request to our endpoint
    if (!defined('REST_REQUEST') || !REST_REQUEST || 
        !isset($_SERVER['REQUEST_URI']) || 
        strpos($_SERVER['REQUEST_URI'], '/wp-json/custom/v1/strings') === false) {
        return $user;
    }

    // If already authenticated, return early
    if ($user instanceof WP_User) {
        pf_log('Already authenticated', ['user_id' => $user->ID]);
        return $user;
    }

    $auth_header = pf_get_auth_header();
    if (empty($auth_header)) {
        pf_log('No authorization header found');
        return null;
    }

    // Check for Basic auth
    if (!preg_match('/^Basic\s+(.*)$/i', $auth_header, $matches)) {
        pf_log('Not Basic auth format');
        return null;
    }

    $base64_credentials = $matches[1];
    $credentials = base64_decode($base64_credentials);
    
    if (!$credentials || strpos($credentials, ':') === false) {
        pf_log('Invalid credentials format');
        return null;
    }

    list($username, $password) = explode(':', $credentials, 2);
    pf_log('Processing auth', ['username' => $username]);

    // Get user by login
    $user = get_user_by('login', $username);
    if (!$user) {
        pf_log('User not found');
        return null;
    }

    // Get and verify application passwords
    $passwords = WP_Application_Passwords::get_user_application_passwords($user->ID);
    if (empty($passwords)) {
        pf_log('No application passwords found for user');
        return null;
    }

    foreach ($passwords as $pw) {
        if (wp_check_password($password, $pw['password'])) {
            pf_log('Application password verified', ['user_id' => $user->ID]);
            wp_set_current_user($user->ID);
            return $user;
        }
    }

    pf_log('Invalid application password');
    return null;
}

// Add our authentication handler
add_filter('determine_current_user', 'pf_authenticate_request', 20);

// Enable CORS and handle preflight
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    
    add_filter('rest_pre_serve_request', function ($value) {
        $origin = get_http_origin();
        
        if ($origin) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        } else {
            header('Access-Control-Allow-Origin: *');
        }
        
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit();
        }
        
        return $value;
    });
}, 15);

// Register REST API endpoint
function register_save_strings_endpoint() {
    register_rest_route('custom/v1', '/strings', [
        'methods' => ['POST', 'OPTIONS'],
        'callback' => 'save_text_string',
        'permission_callback' => function ($request) {
            pf_log('Starting permission check');
            
            $user_id = get_current_user_id();
            pf_log('Current user check', ['user_id' => $user_id]);
            
            if (!$user_id) {
                pf_log('No authenticated user');
                return new WP_Error(
                    'auth_required',
                    'You must be authenticated to use this endpoint.',
                    ['status' => 401]
                );
            }
            
            if (!user_can($user_id, 'edit_posts')) {
                pf_log('User lacks edit_posts capability');
                return new WP_Error(
                    'insufficient_permissions',
                    'You do not have permission to create posts.',
                    ['status' => 403]
                );
            }
            
            pf_log('Permission check passed', ['user_id' => $user_id]);
            return true;
        }
    ]);
}
add_action('rest_api_init', 'register_save_strings_endpoint');

// Save function
function save_text_string($request) {
    try {
        pf_log('Processing save request');
        
        $text_string = $request->get_param('text_string');
        $category = $request->get_param('category');
        
        if (empty($text_string)) {
            return new WP_Error('empty_text', 'Text string cannot be empty', ['status' => 400]);
        }
        
        $post_data = [
            'post_type' => 'text_string',
            'post_title' => wp_trim_words($text_string, 10, '...'),
            'post_content' => wp_kses_post($text_string),
            'post_status' => 'publish',
            'post_author' => get_current_user_id()
        ];
        
        $post_id = wp_insert_post($post_data, true);
        
        if (is_wp_error($post_id)) {
            pf_log('Failed to create post', ['error' => $post_id->get_error_message()]);
            return $post_id;
        }
        
        if (!empty($category)) {
            wp_set_object_terms($post_id, $category, 'string_category');
        }
        
        pf_log('Successfully saved text', ['post_id' => $post_id]);
        
        return rest_ensure_response([
            'success' => true,
            'post_id' => $post_id,
            'message' => 'Text saved successfully'
        ]);
        
    } catch (Exception $e) {
        pf_log('Exception occurred', ['error' => $e->getMessage()]);
        return new WP_Error('server_error', $e->getMessage(), ['status' => 500]);
    }
}

// Register custom post type and add menu items
add_action('init', function() {
    register_post_type('text_string', [
        'label' => 'Text Strings',
        'public' => false,
        'show_ui' => true,
        'supports' => ['title', 'editor', 'custom-fields'],
    ]);

    register_taxonomy('string_category', 'text_string', [
        'label' => 'Categories',
        'hierarchical' => true,
        'show_ui' => true,
    ]);
});

// Add the settings page
add_action('admin_menu', function() {
    add_options_page(
        'Prompt Fox Settings',
        'Prompt Fox',
        'manage_options',
        'prompt-fox-settings',
        'render_settings_page'
    );
});

function render_settings_page() {
    $rest_api_url = get_rest_url(null, 'custom/v1/strings');
    ?>
    <div class="wrap">
        <h1>Prompt Fox Settings</h1>
        <div class="notice notice-info">
            <p><strong>REST API Endpoint:</strong> <?php echo esc_url($rest_api_url); ?></p>
            <p>Use this URL in your Chrome extension settings.</p>
        </div>
        
        <div class="card">
            <h2>Setup Instructions</h2>
            <ol>
                <li>Generate an Application Password:
                    <ul>
                        <li>In WordPress admin, go to Users → Your Profile</li>
                        <li>Scroll down to "Application Passwords"</li>
                        <li>Enter "Prompt Fox Extension" as the name</li>
                        <li>Click "Add New Application Password"</li>
                        <li>Copy the generated password exactly (including spaces)</li>
                    </ul>
                </li>
                <li>Configure the Extension:
                    <ul>
                        <li>Click the Prompt Fox extension icon</li>
                        <li>Select "Options"</li>
                        <li>Enter your WordPress URL (shown above)</li>
                        <li>Enter your WordPress username</li>
                        <li>Paste the application password</li>
                        <li>Click "Save Settings"</li>
                    </ul>
                </li>
            </ol>
        </div>
    </div>
    <?php
}