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
add_action('rest_api_init', function () {
    $headers = getallheaders();
    error_log("Authorization Header: " . $headers['Authorization'] ?? 'Not Set');
});
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
    $authorization = $request->get_param('authorization');
    error_log("Authorization (Body): " . $authorization);

    if (!$authorization) {
        return new WP_Error('auth_missing', 'Authorization header is missing.', ['status' => 401]);
    }
    
    $text_string = sanitize_text_field($request->get_param('text_string'));
    $category = sanitize_text_field($request->get_param('category'));

    error_log("Sanitized Text: $text_string, Category: $category");

    if (empty($text_string)) {
        return new WP_Error('empty_text', 'Text string cannot be empty.', ['status' => 400]);
    }

    $post_id = wp_insert_post([
        'post_type' => 'text_string',
        'post_title' => wp_trim_words($text_string, 10, '...'),
        'post_content' => $text_string,
        'post_status' => 'publish',
    ]);

    if (is_wp_error($post_id)) {
        error_log("Error creating post: " . $post_id->get_error_message());
        return new WP_Error('post_error', 'Failed to save text string.', ['status' => 500]);
    }

    if (!empty($category)) {
        wp_set_object_terms($post_id, $category, 'string_category');
    }

    return rest_ensure_response(['success' => true, 'post_id' => $post_id]);
}
