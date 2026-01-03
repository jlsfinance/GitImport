/**
 * Image Upload Service
 * Handles photo uploads using Cloudinary with unsigned upload preset.
 * 
 * SECURITY NOTE: Uses unsigned Cloudinary upload preset only.
 * No API secrets are exposed on the client side.
 * 
 * Usage:
 *   import { ImageUploadService } from '../services/imageUploadService';
 *   const url = await ImageUploadService.uploadImage(file);
 */

import { CLOUDINARY_CONFIG } from '../constants';

export class ImageUploadService {
    /**
     * Upload an image file to Cloudinary using unsigned upload preset.
     * 
     * @param file - The image file to upload
     * @param folder - Optional folder name in Cloudinary (e.g., 'customers', 'records')
     * @returns The URL of the uploaded image
     */
    static async uploadImage(file: File, folder: string = 'general'): Promise<string> {
        try {
            const cloudinaryUrl = await this.uploadToCloudinary(file, folder);
            if (cloudinaryUrl) return cloudinaryUrl;
            throw new Error('Upload returned empty URL');
        } catch (e) {
            console.error('Cloudinary upload failed:', e);
            throw new Error('Image upload failed. Please try again.');
        }
    }

    /**
     * Upload to Cloudinary using unsigned upload preset.
     * SECURITY: No API secrets required - uses preset configured in Cloudinary Dashboard.
     * To configure: Settings > Upload > Upload Presets > Add Upload Preset > Set to "Unsigned"
     */
    private static async uploadToCloudinary(file: File, folder: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', `jls_suite/${folder}`);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Cloudinary Error:', errorData);
            throw new Error(`Cloudinary upload failed: ${response.status}`);
        }

        const data = await response.json();
        return data.secure_url || data.url;
    }

    /**
     * Compress and resize an image before upload (optional optimization)
     * @param file - Original file
     * @param maxWidth - Max width in pixels
     * @param quality - JPEG quality (0-1)
     */
    static async compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = reject;
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Upload with automatic compression
     */
    static async uploadCompressedImage(file: File, folder: string = 'general'): Promise<string> {
        try {
            const compressedBlob = await this.compressImage(file);
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            return await this.uploadImage(compressedFile, folder);
        } catch (e) {
            // If compression fails, upload original
            console.warn('Compression failed, uploading original:', e);
            return await this.uploadImage(file, folder);
        }
    }
}
