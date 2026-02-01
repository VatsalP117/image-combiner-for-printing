// Image Combiner App
class ImageCombiner {
    constructor() {
        // Page size presets in pixels (at 300 DPI)
        this.pageSizes = {
            'a4': { width: 2480, height: 3508 },        // 210 × 297 mm at 300 DPI
            'letter': { width: 2550, height: 3300 },    // 8.5 × 11 in at 300 DPI
            '4x6': { width: 1200, height: 1800 },       // 4 × 6 in at 300 DPI
            '5x7': { width: 1500, height: 2100 },       // 5 × 7 in at 300 DPI
        };

        this.images = [];
        this.generatedPages = [];

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Settings
        this.pagePresetSelect = document.getElementById('pagePreset');
        this.orientationSelect = document.getElementById('orientation');
        this.customWidthInput = document.getElementById('customWidth');
        this.customHeightInput = document.getElementById('customHeight');
        this.customWidthGroup = document.getElementById('customWidthGroup');
        this.customHeightGroup = document.getElementById('customHeightGroup');
        this.imagesPerRowInput = document.getElementById('imagesPerRow');
        this.spacingInput = document.getElementById('spacing');
        this.paddingInput = document.getElementById('padding');
        this.bgColorInput = document.getElementById('bgColor');

        // Upload
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');

        // Images Section
        this.imagesSection = document.getElementById('imagesSection');
        this.imagesGrid = document.getElementById('imagesGrid');
        this.imageCount = document.getElementById('imageCount');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.generateBtn = document.getElementById('generateBtn');

        // Pages Section
        this.pagesSection = document.getElementById('pagesSection');
        this.pagesContainer = document.getElementById('pagesContainer');
        this.pageCount = document.getElementById('pageCount');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

        // Canvas
        this.canvas = document.getElementById('renderCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    initEventListeners() {
        // Page preset change
        this.pagePresetSelect.addEventListener('change', () => {
            const isCustom = this.pagePresetSelect.value === 'custom';
            this.customWidthGroup.style.display = isCustom ? 'flex' : 'none';
            this.customHeightGroup.style.display = isCustom ? 'flex' : 'none';
        });

        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            e.target.value = ''; // Reset to allow same file selection
        });

        // Buttons
        this.clearAllBtn.addEventListener('click', () => this.clearAllImages());
        this.generateBtn.addEventListener('click', () => this.generatePages());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllPages());
    }

    async handleFiles(files) {
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];
        const imageFiles = Array.from(files).filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return file.type.startsWith('image/') || validExtensions.includes(ext);
        });

        if (imageFiles.length === 0) return;

        // Show loading state
        const uploadContent = this.uploadArea.querySelector('.upload-content');
        const originalContent = uploadContent.innerHTML;
        uploadContent.innerHTML = `
            <span class="loading" style="width: 40px; height: 40px; margin-bottom: 1rem;"></span>
            <p>Processing images...</p>
            <p class="upload-hint">HEIC files may take a moment to convert</p>
        `;

        for (const file of imageFiles) {
            try {
                // Check if it's a HEIC file (case-insensitive)
                const ext = file.name.split('.').pop().toLowerCase();
                const isHeic = ext === 'heic' || ext === 'heif' ||
                    file.type === 'image/heic' || file.type === 'image/heif' ||
                    file.type === ''; // Sometimes HEIC files have empty MIME type

                if (isHeic) {
                    console.log(`Converting HEIC file: ${file.name}`);
                    try {
                        // Convert HEIC to JPEG
                        const convertedBlob = await heic2any({
                            blob: file,
                            toType: 'image/jpeg',
                            quality: 0.92
                        });
                        // heic2any may return array for multi-image HEIC
                        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
                        const convertedFile = new File([blob], newName, { type: 'image/jpeg' });
                        console.log(`Successfully converted: ${file.name} -> ${newName}`);
                        await this.addImage(convertedFile);
                    } catch (heicError) {
                        console.error(`HEIC conversion failed for ${file.name}:`, heicError);

                        // Try to load it directly (Safari can handle HEIC natively)
                        try {
                            console.log(`Trying native load for: ${file.name}`);
                            await this.addImage(file);
                        } catch (nativeError) {
                            alert(`Could not process ${file.name}. Error: ${heicError.message || 'Unknown error'}\n\nTry converting the file to JPEG first using an online converter or the Preview app on Mac.`);
                        }
                    }
                } else {
                    await this.addImage(file);
                }
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                alert(`Failed to process ${file.name}. It may be corrupted or unsupported.`);
            }
        }

        // Restore upload area
        uploadContent.innerHTML = originalContent;
        this.updateUI();
    }

    addImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.images.push({
                        id: Date.now() + Math.random(),
                        file: file,
                        src: e.target.result,
                        element: img,
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    });
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    removeImage(id) {
        this.images = this.images.filter(img => img.id !== id);
        this.updateUI();
    }

    clearAllImages() {
        this.images = [];
        this.generatedPages = [];
        this.updateUI();
    }

    updateUI() {
        // Update image count
        this.imageCount.textContent = this.images.length;

        // Show/hide images section
        this.imagesSection.style.display = this.images.length > 0 ? 'block' : 'none';

        // Render image grid
        this.imagesGrid.innerHTML = '';
        this.images.forEach(img => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.innerHTML = `
                <img src="${img.src}" alt="Uploaded image">
                <button class="remove-btn" title="Remove">×</button>
            `;
            card.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImage(img.id);
            });
            this.imagesGrid.appendChild(card);
        });

        // Hide pages section if no pages
        if (this.generatedPages.length === 0) {
            this.pagesSection.style.display = 'none';
        }
    }

    getPageDimensions() {
        const preset = this.pagePresetSelect.value;
        const orientation = this.orientationSelect.value;

        let width, height;

        if (preset === 'custom') {
            width = parseInt(this.customWidthInput.value) || 2480;
            height = parseInt(this.customHeightInput.value) || 3508;
        } else {
            const size = this.pageSizes[preset];
            width = size.width;
            height = size.height;
        }

        // Swap for landscape
        if (orientation === 'landscape') {
            [width, height] = [height, width];
        }

        return { width, height };
    }

    async generatePages() {
        if (this.images.length === 0) {
            alert('Please add some images first!');
            return;
        }

        this.generateBtn.innerHTML = '<span class="loading"></span> Generating...';
        this.generateBtn.disabled = true;

        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            this.generatedPages = [];

            const { width, height } = this.getPageDimensions();
            const spacing = parseInt(this.spacingInput.value) || 20;
            const padding = parseInt(this.paddingInput.value) || 40;
            const bgColor = this.bgColorInput.value;
            const smartPack = document.getElementById('smartPack').checked;

            // Calculate available space
            const availableWidth = width - (padding * 2);
            const availableHeight = height - (padding * 2);

            if (smartPack) {
                // TRUE SMART PACKING: Ignore grid, maximize images per page
                this.generateSmartPackedPages(availableWidth, availableHeight, spacing, padding, width, height);
            } else {
                // Grid-based packing (original behavior)
                const imagesPerRow = parseInt(this.imagesPerRowInput.value) || 2;
                const cellWidth = (availableWidth - (spacing * (imagesPerRow - 1))) / imagesPerRow;
                this.generateGridPages(cellWidth, imagesPerRow, spacing, padding, width, height);
            }

            // Render all pages
            await this.renderPages(width, height, bgColor);

        } catch (error) {
            console.error('Error generating pages:', error);
            alert('Error generating pages. Please try again.');
        }

        this.generateBtn.innerHTML = 'Generate Pages';
        this.generateBtn.disabled = false;
    }

    /**
     * Grid-based page generation (when Smart Pack is OFF)
     */
    generateGridPages(cellWidth, imagesPerRow, spacing, padding, pageWidth, pageHeight) {
        let currentPage = [];
        let currentY = padding;
        let currentRowHeight = 0;
        let currentRowImages = [];

        for (const img of this.images) {
            const scale = cellWidth / img.width;
            const scaledHeight = img.height * scale;

            // Check if we need a new row
            if (currentRowImages.length >= imagesPerRow) {
                currentY += currentRowHeight + spacing;
                currentRowHeight = 0;
                currentRowImages = [];
            }

            // Check if we need a new page
            if (currentY + scaledHeight > pageHeight - padding && currentPage.length > 0) {
                this.generatedPages.push([...currentPage]);
                currentPage = [];
                currentY = padding;
                currentRowHeight = 0;
                currentRowImages = [];
            }

            currentRowImages.push({
                img: img,
                x: padding + (currentRowImages.length * (cellWidth + spacing)),
                y: currentY,
                width: cellWidth,
                height: scaledHeight
            });

            currentRowHeight = Math.max(currentRowHeight, scaledHeight);
            currentPage.push(currentRowImages[currentRowImages.length - 1]);
        }

        if (currentPage.length > 0) {
            this.generatedPages.push(currentPage);
        }
    }

    /**
     * TRUE Smart Pack: 2D Bin Packing to MINIMIZE pages
     * Ignores images-per-row, dynamically fits as many images as possible
     */
    generateSmartPackedPages(availableWidth, availableHeight, spacing, padding, pageWidth, pageHeight) {
        // Calculate target image height based on trying to fit ~4-6 images per page
        // This is a heuristic that works well for most photo collections
        const targetRowHeight = availableHeight / 4; // Aim for ~4 rows per page

        // Prepare images with dimensions scaled to target row height
        const preparedImages = this.images.map(img => {
            const aspectRatio = img.width / img.height;
            return {
                ...img,
                displayHeight: targetRowHeight,
                displayWidth: targetRowHeight * aspectRatio
            };
        });

        // Sort by width (widest first) - helps with row packing
        const sortedImages = [...preparedImages].sort((a, b) => b.displayWidth - a.displayWidth);

        const used = new Set();
        let currentPage = [];
        let currentY = padding;

        while (used.size < sortedImages.length) {
            // Build a row: greedily pack images that fit in remaining width
            const row = [];
            let rowWidth = 0;
            let rowHeight = 0;

            // First pass: find images that fit in this row
            for (const img of sortedImages) {
                if (used.has(img.id)) continue;

                const neededWidth = row.length > 0 ? img.displayWidth + spacing : img.displayWidth;

                if (rowWidth + neededWidth <= availableWidth) {
                    row.push(img);
                    rowWidth += neededWidth;
                    rowHeight = Math.max(rowHeight, img.displayHeight);
                    used.add(img.id);
                }
            }

            // If no images fit, force add the smallest remaining image
            if (row.length === 0) {
                for (const img of [...sortedImages].reverse()) {
                    if (!used.has(img.id)) {
                        row.push(img);
                        rowWidth = img.displayWidth;
                        rowHeight = img.displayHeight;
                        used.add(img.id);
                        break;
                    }
                }
            }

            // Scale row to fit full width (maximize space usage)
            const scaleFactor = availableWidth / rowWidth;
            const scaledRowHeight = rowHeight * scaleFactor;

            // Check if row fits on current page
            if (currentY + scaledRowHeight > pageHeight - padding && currentPage.length > 0) {
                // Start new page
                this.generatedPages.push([...currentPage]);
                currentPage = [];
                currentY = padding;
            }

            // Place images in this row
            let x = padding;
            for (const img of row) {
                const scaledWidth = img.displayWidth * scaleFactor;
                const scaledHeight = img.displayHeight * scaleFactor;

                currentPage.push({
                    img: img,
                    x: x,
                    y: currentY,
                    width: scaledWidth,
                    height: scaledHeight
                });

                x += scaledWidth + spacing * scaleFactor;
            }

            currentY += scaledRowHeight + spacing;
        }

        if (currentPage.length > 0) {
            this.generatedPages.push(currentPage);
        }
    }

    async renderPages(width, height, bgColor) {
        this.pagesContainer.innerHTML = '';
        const orientation = this.orientationSelect.value;

        for (let i = 0; i < this.generatedPages.length; i++) {
            const pageImages = this.generatedPages[i];

            // Set canvas size
            this.canvas.width = width;
            this.canvas.height = height;

            // Draw background
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(0, 0, width, height);

            // Draw images
            for (const item of pageImages) {
                this.ctx.drawImage(
                    item.img.element,
                    item.x,
                    item.y,
                    item.width,
                    item.height
                );
            }

            // Convert to data URL
            const dataUrl = this.canvas.toDataURL('image/png');

            // Create page card
            const pageCard = document.createElement('div');
            pageCard.className = `page-card ${orientation}`;
            pageCard.innerHTML = `
                <img class="page-preview" src="${dataUrl}" alt="Page ${i + 1}">
                <div class="page-actions">
                    <span class="page-label">Page ${i + 1}</span>
                    <button class="page-download-btn" data-page="${i}">⬇️ Download</button>
                </div>
            `;

            pageCard.querySelector('.page-download-btn').addEventListener('click', () => {
                this.downloadPage(dataUrl, i + 1);
            });

            this.pagesContainer.appendChild(pageCard);
        }

        // Update page count and show section
        this.pageCount.textContent = this.generatedPages.length;
        this.pagesSection.style.display = 'block';

        // Scroll to pages section
        this.pagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    downloadPage(dataUrl, pageNumber) {
        const link = document.createElement('a');
        link.download = `combined-page-${pageNumber}.png`;
        link.href = dataUrl;
        link.click();
    }

    async downloadAllPages() {
        const { width, height } = this.getPageDimensions();
        const bgColor = this.bgColorInput.value;

        for (let i = 0; i < this.generatedPages.length; i++) {
            const pageImages = this.generatedPages[i];

            // Set canvas size
            this.canvas.width = width;
            this.canvas.height = height;

            // Draw background
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(0, 0, width, height);

            // Draw images
            for (const item of pageImages) {
                this.ctx.drawImage(
                    item.img.element,
                    item.x,
                    item.y,
                    item.width,
                    item.height
                );
            }

            // Download
            const dataUrl = this.canvas.toDataURL('image/png');
            this.downloadPage(dataUrl, i + 1);

            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new ImageCombiner();
});
