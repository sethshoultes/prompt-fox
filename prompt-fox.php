<?php
/**
 * Plugin Name: Prompt Fox!
 * Description: Adds a custom REST API endpoint to save text strings from the Prompt Fox! Google Chrome extension. By Seth Shoultes for promptbuildr.com
 * Version: 1.0
 * Author: sethshoultes
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Enable CORS for REST API
add_action('rest_api_init', function () {
    //$headers = getallheaders();
    //error_log("Authorization Header: " . $headers['Authorization'] ?? 'Not Set');
    add_filter('rest_pre_serve_request', function ($value) {
        return true;
    });
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Credentials: true");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }
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
    register_rest_route('custom/v1', '/strings', [
        'methods' => 'POST',
        'callback' => 'save_text_string',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);
}
add_action('rest_api_init', 'register_save_strings_endpoint');

// Callback for Saving Text Strings
function save_text_string(WP_REST_Request $request) {
    // Get the username and password from the Authorization header
    $authorization_header = $request->get_header('Authorization');
    if (!$authorization_header || !preg_match('/Basic\s+(.*)/', $authorization_header, $matches)) {
        return new WP_Error('auth_failed', 'Authorization header is missing or invalid.', ['status' => 401]);
    }
    list($username, $password) = explode(':', base64_decode($matches[1]), 2);

    // Authenticate the user
    $user = wp_authenticate($username, $password);
    if (is_wp_error($user)) {
        return new WP_Error('auth_failed', 'Invalid credentials.', ['status' => 401]);
    }

    // Proceed with saving the text
    $text_string = sanitize_text_field($request->get_param('text_string'));
    $category = sanitize_text_field($request->get_param('category'));

    // Validate the text string
    if (empty($text_string)) {
        return new WP_Error('empty_text', 'Text string cannot be empty.', ['status' => 400]);
    }

    // Save the text string as a post
    $post_id = wp_insert_post([
        'post_type' => 'text_string',
        'post_title' => wp_trim_words($text_string, 10, '...'),
        'post_content' => $text_string,
        'post_status' => 'publish',
    ]);

    // Assign the post to the current user
    if (!empty($category)) {
        wp_set_object_terms($post_id, $category, 'string_category');
    }

    return rest_ensure_response(['success' => true, 'post_id' => $post_id]);
}

// Add a settings page to the WordPress admin menu
add_action('admin_menu', function () {
    add_options_page(
        'Prompt Fox Settings',       // Page title
        'Prompt Fox',                // Menu title
        'manage_options',            // Capability required
        'prompt-fox-settings',       // Menu slug
        'render_prompt_fox_settings' // Callback to display the page
    );
});
// Callback function to render the settings page
function render_prompt_fox_settings() {
    // Get the REST API URL dynamically
    $rest_api_url = get_rest_url(null, 'custom/v1/strings');

    ?>
    <div class="wrap">
        <h1>Prompt Fox Settings</h1>
        <p>This is your REST API endpoint. Use this URL in your Chrome extension settings:</p>
        <input type="text" value="<?php echo esc_url($rest_api_url); ?>" readonly style="width: 100%; padding: 8px;">
        <p>Provide your WordPress username and an application password in the Chrome extension settings.</p>
        <p>
            <strong>How to Generate an Application Password:</strong>
            <ol>
                <li>Go to <strong>Users > Profile</strong> in the WordPress admin panel.</li>
                <li>Scroll down to <strong>Application Passwords</strong> and create a new one.</li>
                <li>Copy the generated password and use it in the Chrome extension.</li>
            </ol>
        </p>
    </div>
    <?php
}
function add_prompt_fox_admin_styles() {
    echo '<style>
        .wrap h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .wrap p {
            margin: 10px 0;
            font-size: 16px;
        }
        input[readonly] {
            font-family: monospace;
            font-size: 14px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>';
}
add_action('admin_head', 'add_prompt_fox_admin_styles');
