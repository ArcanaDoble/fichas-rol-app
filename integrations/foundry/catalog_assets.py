"""Convert Storage image references to paths available in the offline Foundry system."""

import hashlib


STORAGE_PREFIX = 'https://firebasestorage.googleapis.com/'
ASSET_PREFIX = 'systems/noma-roguelite/assets/'


def asset_filename(url):
    extension = '.png' if '.png' in url else '.webp'
    return hashlib.sha256(url.encode()).hexdigest()[:20] + extension


def offline_images(value, assets):
    if isinstance(value, list):
        return [offline_images(entry, assets) for entry in value]
    if isinstance(value, dict):
        result = {key: offline_images(entry, assets) for key, entry in value.items()}
        # Source portraits and headers can point to private originals of the bundled image.
        for key in ('imageSource', 'portraitSource', 'headerImage', 'avatar'):
            if key in result and not result[key] and isinstance(value[key], str) and value[key].startswith(STORAGE_PREFIX):
                result[key] = result.get('image') or result.get('icon') or ''
        return result
    if isinstance(value, str) and value.startswith(STORAGE_PREFIX):
        filename = asset_filename(value)
        return ASSET_PREFIX + filename if (assets / filename).is_file() else ''
    return value
