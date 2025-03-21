/**
 * Video Uploader Module
 * Handles uploading videos to S3 via presigned URLs
 */
class VideoUploader {
    constructor() {
        this.courseId = null;
        this.uploads = [];
        this.API_URL = 'http://localhost:5001/api';
    }

    /**
     * Initialize the uploader with a courseId
     * @param {string} courseId - The ID of the course to upload videos for
     */
    init(courseId) {
        if (!courseId) {
            console.error('VideoUploader: No course ID provided');
            return false;
        }
        this.courseId = courseId;
        console.log('VideoUploader initialized for course:', courseId);
        return true;
    }

    /**
     * Get a presigned URL for uploading a video
     * @param {File} file - The video file to upload
     * @param {string} lessonTitle - The title of the lesson
     * @param {string} lessonDescription - The description of the lesson
     * @returns {Promise} - Promise resolving to upload details
     */
    async getUploadUrl(file, lessonTitle, lessonDescription) {
        try {
            console.log('Requesting upload URL for:', file.name);
            
            const formData = {
                fileName: file.name,
                fileType: file.type,
                courseId: this.courseId,
                lessonTitle: lessonTitle || 'New Lesson',
                lessonDescription: lessonDescription || ''
            };

            const response = await fetch(`${this.API_URL}/uploads/video-upload-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Error getting upload URL:', error);
                throw new Error(error.message || 'Failed to get upload URL');
            }

            const data = await response.json();
            console.log('Upload URL received:', data.uploadUrl ? 'Success' : 'Failed');
            return data;
        } catch (error) {
            console.error('Error in getUploadUrl:', error);
            throw error;
        }
    }

    /**
     * Upload a video file to S3 using a presigned URL
     * @param {File} file - The video file to upload
     * @param {string} uploadUrl - The presigned URL for uploading
     * @param {Function} progressCallback - Callback to update progress
     * @returns {Promise} - Promise resolving when upload completes
     */
    async uploadToS3(file, uploadUrl, progressCallback) {
        try {
            console.log('Starting upload for:', file.name);
            console.log('Upload URL:', uploadUrl);
            
            // Check if this is a local upload URL
            const isLocalUpload = uploadUrl.includes('local-upload');
            
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                // Track upload progress
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        if (progressCallback) {
                            progressCallback({
                                progress,
                                loaded: event.loaded,
                                total: event.total
                            });
                        }
                    }
                });
                
                // Handle completion
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        console.log('Upload successful for:', file.name);
                        
                        // For local uploads, try to get additional data from the response
                        let responseData = {};
                        if (xhr.responseText) {
                            try {
                                responseData = JSON.parse(xhr.responseText);
                            } catch (e) {
                                console.warn('Could not parse response:', e);
                            }
                        }
                        
                        resolve({
                            success: true,
                            status: xhr.status,
                            ...responseData
                        });
                    } else {
                        console.error('Upload failed with status:', xhr.status, xhr.responseText);
                        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
                    }
                });
                
                // Handle errors
                xhr.addEventListener('error', () => {
                    console.error('Upload network error for:', file.name);
                    reject(new Error('Network error during upload'));
                });
                
                xhr.addEventListener('abort', () => {
                    console.warn('Upload aborted for:', file.name);
                    reject(new Error('Upload aborted'));
                });

                xhr.addEventListener('timeout', () => {
                    console.error('Upload timeout for:', file.name);
                    reject(new Error('Upload timed out'));
                });
                
                // Different handling for local vs S3 uploads
                if (isLocalUpload) {
                    // For local upload, we need to use FormData
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    xhr.open('POST', uploadUrl);
                    // No Content-Type header for multipart/form-data
                    xhr.send(formData);
                } else {
                    // For S3 presigned URL, use PUT with exact content type
                    xhr.open('PUT', uploadUrl);
                    xhr.setRequestHeader('Content-Type', file.type);
                    xhr.send(file);
                }
            });
        } catch (error) {
            console.error('Error in uploadToS3:', error);
            throw error;
        }
    }

    /**
     * Add a video to course materials after upload
     * @param {Object} data - Data about the uploaded video
     * @returns {Promise} - Promise resolving when material is added
     */
    async addVideoToCourse(data) {
        try {
            console.log('Adding video to course materials:', data);
            
            const response = await fetch(`${this.API_URL}/uploads/add-video-to-course`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    courseId: this.courseId,
                    materialData: data.materialData
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Error adding video to course:', error);
                throw new Error(error.message || 'Failed to add video to course');
            }

            const responseData = await response.json();
            console.log('Video added to course successfully:', responseData);
            return responseData;
        } catch (error) {
            console.error('Error in addVideoToCourse:', error);
            throw error;
        }
    }

    /**
     * Upload a video with title and description
     * @param {File} file - The video file to upload
     * @param {string} title - The title of the lesson
     * @param {string} description - The description of the lesson
     * @param {Function} progressCallback - Callback to update progress
     * @param {Function} completedCallback - Callback for when upload completes
     */
    async uploadVideo(file, title, description, progressCallback, completedCallback) {
        try {
            if (!this.courseId) {
                throw new Error('No course ID set. Please initialize the uploader first.');
            }

            if (!file) {
                throw new Error('No file provided for upload.');
            }

            console.log('Starting video upload process for:', file.name);
            
            // Prepare upload information
            const uploadInfo = {
                id: Date.now().toString(),
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                title: title || 'New Lesson',
                description: description || '',
                progress: 0,
                status: 'preparing',
                error: null,
                videoUrl: null
            };

            // Add to uploads list
            this.uploads.push(uploadInfo);
            
            // Get upload URL
            uploadInfo.status = 'getting_url';
            if (progressCallback) progressCallback(uploadInfo);
            
            try {
                const uploadData = await this.getUploadUrl(file, title, description);
                
                console.log('Upload URL data received:', uploadData);
                
                // Start upload
                uploadInfo.status = 'uploading';
                uploadInfo.videoUrl = uploadData.videoUrl;
                if (progressCallback) progressCallback(uploadInfo);
                
                const uploadResult = await this.uploadToS3(file, uploadData.uploadUrl, (progress) => {
                    uploadInfo.progress = progress.progress;
                    if (progressCallback) progressCallback(uploadInfo);
                });
                
                console.log('Upload result:', uploadResult);
                
                // For local uploads, the server might return an updated videoUrl
                if (uploadResult.videoUrl) {
                    uploadData.videoUrl = uploadResult.videoUrl;
                    uploadInfo.videoUrl = uploadResult.videoUrl;
                }
                
                // Add to course materials
                uploadInfo.status = 'processing';
                if (progressCallback) progressCallback(uploadInfo);
                
                const materialData = {
                    materialData: {
                        title: title || 'New Lesson',
                        description: description || '',
                        type: 'video',
                        videoUrl: uploadData.videoUrl,
                        uploadDate: new Date(),
                        duration: 0
                    }
                };
                
                await this.addVideoToCourse({
                    courseId: this.courseId,
                    materialData: materialData
                });
                
                // Upload complete
                uploadInfo.status = 'completed';
                uploadInfo.progress = 100;
                if (progressCallback) progressCallback(uploadInfo);
                if (completedCallback) completedCallback(uploadInfo);
                
                console.log('Video upload completed successfully:', file.name);
                return uploadInfo;
            } catch (error) {
                console.error('Error during video upload:', error);
                uploadInfo.status = 'error';
                uploadInfo.error = error.message;
                if (progressCallback) progressCallback(uploadInfo);
                throw error;
            }
        } catch (error) {
            console.error('Error in uploadVideo:', error);
            throw error;
        }
    }

    /**
     * Get a list of all uploads
     * @returns {Array} - Array of upload objects
     */
    getUploads() {
        return this.uploads;
    }

    /**
     * Generate video player HTML for a video
     * @param {string} videoUrl - The URL of the video
     * @param {string} posterUrl - The URL of the poster image (optional)
     * @returns {string} - HTML for the video player
     */
    getVideoPlayerHtml(videoUrl, posterUrl = '') {
        return `
            <video controls preload="metadata" ${posterUrl ? `poster="${posterUrl}"` : ''} class="video-player">
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    }
}

// Create global instance
window.videoUploader = new VideoUploader(); 