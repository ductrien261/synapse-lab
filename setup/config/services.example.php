<?php

// Merge these entries into config/services.php; do not replace the entire file.
return [
    'zoom' => [
        'account_id' => env('ZOOM_ACCOUNT_ID', ''),
        'client_id' => env('ZOOM_CLIENT_ID', ''),
        'client_secret' => env('ZOOM_CLIENT_SECRET', ''),
        'webhook_secret' => env('ZOOM_WEBHOOK_SECRET', ''),
    ],
    'youtube' => [
        'client_id' => env('YOUTUBE_CLIENT_ID', ''),
        'client_secret' => env('YOUTUBE_CLIENT_SECRET', ''),
        'refresh_token' => env('YOUTUBE_REFRESH_TOKEN', ''),
        'auto_livestream_enabled' => env('YOUTUBE_AUTO_LIVESTREAM_ENABLED', false),
        'livestream_privacy' => env('YOUTUBE_LIVESTREAM_PRIVACY', 'unlisted'),
        'livestream_prepare_minutes' => env('YOUTUBE_LIVESTREAM_PREPARE_MINUTES', 120),
        'queue_connection' => env('ZOOM_YOUTUBE_QUEUE_CONNECTION', 'database'),
    ],
    'classroom' => [
        'storage' => env('CLASSROOM_STORAGE', 'local'),
        'local_path' => env('CLASSROOM_LOCAL_PATH', 'storage/app/recordings'),
    ],
];
