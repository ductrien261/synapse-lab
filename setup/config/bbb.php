<?php

use App\Constants\BbbConstants;

return [
    'enabled' => env('BBB_ENABLED', false),
    'url' => env('BBB_URL', ''),
    'secret' => env('BBB_SECRET', ''),
    'checksum_algorithm' => env('BBB_CHECKSUM_ALGORITHM', BbbConstants::DEFAULT_CHECKSUM_ALGORITHM),
    'ssl_verify' => env('BBB_SSL_VERIFY', true),
    'connect_timeout' => (int)env('BBB_CONNECT_TIMEOUT', 5),
    'timeout' => (int)env('BBB_TIMEOUT', 15),
    'recording_callback_secret' => env('BBB_RECORDING_CALLBACK_SECRET', ''),
];
