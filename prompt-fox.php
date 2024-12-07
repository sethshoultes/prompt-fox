<?php
/**
 * Plugin Name: Prompt Fox!
 * Description: Adds a custom REST API endpoint to save text strings from the Prompt Fox! Google Chrome extension.
 * Version: 1.0
 * Author: sethshoultes
 */

if (!defined('ABSPATH')) {
    exit;
}

// Debug logging functions
function pf_log($message) {
    if (WP_DEBUG) {
        error_log('Prompt Fox: ' . print_r($message, true));
    }
}

function log_request_details() {
    if (WP_DEBUG) {
        error_log('Request Headers: ' . print_r(getallheaders(), true));
        error_log('Request Method: ' . $_SERVER['REQUEST_METHOD']);
        error_log('Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'not set'));
        error_log('Request URI: ' . $_SERVER['REQUEST_URI']);
    }
}

// Hook early to log request details
add_action('rest_api_init', 'log_request_details', 5);

// Enable CORS and handle preflight
add_action('rest_api_init', function () {
    add_filter('rest_pre_serve_request', function ($value) {
        $origin = get_http_origin();
        
        // Allow Chrome extension origin explicitly
        if (strpos($origin, 'chrome-extension://') === 0) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            header("Access-Control-Allow-Origin: *");
        }

        header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            header("HTTP/1.1 200 OK");
            exit();
        }

        return $value;
    }, 15);
}, 15);

// Register Custom Post Type
function register_text_strings_cpt() {
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
}
add_action('init', 'register_text_strings_cpt');

// Register REST API Endpoint
function register_save_strings_endpoint() {
    // Register POST endpoint for saving strings
    register_rest_route('custom/v1', '/strings', [
        'methods' => ['POST', 'OPTIONS'],
        'callback' => 'save_text_string',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);

    // Register GET endpoint for fetching strings
    register_rest_route('custom/v1', '/strings', [
        'methods' => 'GET',
        'callback' => 'get_text_strings',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
        'args' => [
            'per_page' => [
                'default' => 10,
                'sanitize_callback' => 'absint'
            ],
            'page' => [
                'default' => 1,
                'sanitize_callback' => 'absint'
            ],
            'search' => [
                'default' => '',
                'sanitize_callback' => 'sanitize_text_field'
            ]
        ]
    ]);

    register_rest_route('custom/v1', '/strings/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'get_single_text_string',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
        'args' => [
            'id' => [
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            ]
        ]
    ]);
}
add_action('rest_api_init', 'register_save_strings_endpoint');

// Callback for Saving Text Strings
function save_text_string(WP_REST_Request $request) {
    // Get the authorization header
    $authorization_header = $request->get_header('Authorization');
    pf_log('Auth header received');

    if (!$authorization_header || !preg_match('/Basic\s+(.*)/', $authorization_header, $matches)) {
        pf_log('Missing or invalid auth header');
        return new WP_Error('auth_failed', 'Authorization header is missing or invalid.', ['status' => 401]);
    }

    list($username, $password) = explode(':', base64_decode($matches[1]), 2);
    pf_log('Processing auth for user: ' . $username);

    // Authenticate the user
    $user = wp_authenticate($username, $password);
    if (is_wp_error($user)) {
        pf_log('Authentication failed: ' . $user->get_error_message());
        return new WP_Error('auth_failed', 'Invalid credentials.', ['status' => 401]);
    }

    // Save the text
    $text_string = sanitize_text_field($request->get_param('text_string'));
    $category = sanitize_text_field($request->get_param('category'));

    if (empty($text_string)) {
        pf_log('Empty text string provided');
        return new WP_Error('empty_text', 'Text string cannot be empty.', ['status' => 400]);
    }

    // Save as post
    $post_id = wp_insert_post([
        'post_type' => 'text_string',
        'post_title' => wp_trim_words($text_string, 10, '...'),
        'post_content' => $text_string,
        'post_status' => 'publish',
    ]);

    if (!empty($category)) {
        wp_set_object_terms($post_id, $category, 'string_category');
    }

    pf_log('Text saved successfully with ID: ' . $post_id);
    return rest_ensure_response(['success' => true, 'post_id' => $post_id]);
}
function get_text_strings(WP_REST_Request $request) {
    $per_page = $request->get_param('per_page');
    $page = $request->get_param('page');
    $search = $request->get_param('search');

    $args = [
        'post_type' => 'text_string',
        'posts_per_page' => $per_page,
        'paged' => $page,
        'orderby' => 'date',
        'order' => 'DESC',
    ];

    if (!empty($search)) {
        $args['s'] = $search;
    }

    $query = new WP_Query($args);
    $posts = [];

    foreach ($query->posts as $post) {
        $categories = wp_get_post_terms($post->ID, 'string_category', ['fields' => 'names']);
        $posts[] = [
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'date' => $post->post_date,
            'categories' => $categories
        ];
    }

    $total_posts = $query->found_posts;
    $total_pages = ceil($total_posts / $per_page);

    return rest_ensure_response([
        'success' => true,
        'data' => $posts,
        'total' => $total_posts,
        'total_pages' => $total_pages,
        'current_page' => $page
    ]);
}

function get_single_text_string(WP_REST_Request $request) {
    $post_id = $request->get_param('id');
    $post = get_post($post_id);

    if (!$post || $post->post_type !== 'text_string') {
        return new WP_Error(
            'not_found', 
            'Prompt not found', 
            ['status' => 404]
        );
    }

    $categories = wp_get_post_terms($post->ID, 'string_category', ['fields' => 'names']);
    
    return rest_ensure_response([
        'success' => true,
        'data' => [
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'date' => $post->post_date,
            'categories' => $categories
        ]
    ]);
}

// Add settings page
add_action('admin_menu', function () {
    add_options_page(
        'Prompt Fox Settings',
        'Prompt Fox',
        'manage_options',
        'prompt-fox-settings',
        'render_prompt_fox_settings'
    );
});

function render_prompt_fox_settings() {
    $rest_api_url = get_rest_url(null, 'custom/v1/strings');
    $user = wp_get_current_user();
    ?>
    <div class="wrap">
        <h1>Prompt Fox Settings</h1>
        <div class="notice notice-info">
            <p><strong>REST API Endpoint:</strong> <?php echo esc_url($rest_api_url); ?></p>
            <p><strong>Current User:</strong> <?php echo esc_html($user->user_login); ?></p>
        </div>
        
        <div class="card">
            <h2>Setup Instructions</h2>
            <ol>
                <li>Generate an Application Password:
                    <ul>
                        <li>Go to <strong>Users > Profile</strong></li>
                        <li>Scroll to <strong>Application Passwords</strong></li>
                        <li>Name: "Prompt Fox Extension"</li>
                        <li>Copy the generated password exactly (including spaces)</li>
                    </ul>
                </li>
                <li>Configure Extension:
                    <ul>
                        <li>Click extension icon</li>
                        <li>Select "Options"</li>
                        <li>API URL: <code><?php echo esc_url($rest_api_url); ?></code></li>
                        <li>Username: <code><?php echo esc_html($user->user_login); ?></code></li>
                        <li>Password: Your generated application password</li>
                    </ul>
                </li>
            </ol>
        </div>
    </div>
    <?php
}