 
class ImageCombiner {
    constructor() {
         
        this.pageSizes = {
            'a4': { width: 2480, height: 3508 },         
            'letter': { width: 2550, height: 3300 },     
            '4x6': { width: 1200, height: 1800 },        
            '5x7': { width: 1500, height: 2100 },        
        };

        this.images = [];
        this.generatedPages = [];

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
         
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

         
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');

         
        this.imagesSection = document.getElementById('imagesSection');
        this.imagesGrid = document.getElementById('imagesGrid');
        this.imageCount = document.getElementById('imageCount');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.generateBtn = document.getElementById('generateBtn');

         
        this.pagesSection = document.getElementById('pagesSection');
        this.pagesContainer = document.getElementById('pagesContainer');
        this.pageCount = document.getElementById('pageCount');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

         
        this.canvas = document.getElementById('renderCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    initEventListeners() {
         
        this.pagePresetSelect.addEventListener('change', () => {
            const isCustom = this.pagePresetSelect.value === 'custom';
            this.customWidthGroup.style.display = isCustom ? 'flex' : 'none';
            this.customHeightGroup.style.display = isCustom ? 'flex' : 'none';
        });

         
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

         
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            e.target.value = '';  
        });

         
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

         
        const uploadContent = this.uploadArea.querySelector('.upload-content');
        const originalContent = uploadContent.innerHTML;
        uploadContent.innerHTML = `
            <span class="loading" style="width: 40px; height: 40px; margin-bottom: 1rem;"></span>
            <p>Processing images...</p>
            <p class="upload-hint">HEIC files may take a moment to convert</p>
        `;

        for (const file of imageFiles) {
            try {
                 
                const ext = file.name.split('.').pop().toLowerCase();
                const isHeic = ext === 'heic' || ext === 'heif' ||
                    file.type === 'image/heic' || file.type === 'image/heif' ||
                    file.type === '';  

                if (isHeic) {
                    console.log(`Converting HEIC file: ${file.name}`);
                    try {
                         
                        const convertedBlob = await heic2any({
                            blob: file,
                            toType: 'image/jpeg',
                            quality: 0.92
                        });
                         
                        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
                        const convertedFile = new File([blob], newName, { type: 'image/jpeg' });
                        console.log(`Successfully converted: ${file.name} -> ${newName}`);
                        await this.addImage(convertedFile);
                    } catch (heicError) {
                        console.error(`HEIC conversion failed for ${file.name}:`, heicError);

                         
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
         
        this.imageCount.textContent = this.images.length;

         
        this.imagesSection.style.display = this.images.length > 0 ? 'block' : 'none';

         
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

         
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            this.generatedPages = [];

            const { width, height } = this.getPageDimensions();
            const spacing = parseInt(this.spacingInput.value) || 20;
            const padding = parseInt(this.paddingInput.value) || 40;
            const bgColor = this.bgColorInput.value;
            const smartPack = document.getElementById('smartPack').checked;

             
            const availableWidth = width - (padding * 2);
            const availableHeight = height - (padding * 2);

            if (smartPack) {
                 
                this.generateSmartPackedPages(availableWidth, availableHeight, spacing, padding, width, height);
            } else {
                 
                const imagesPerRow = parseInt(this.imagesPerRowInput.value) || 2;
                const cellWidth = (availableWidth - (spacing * (imagesPerRow - 1))) / imagesPerRow;
                this.generateGridPages(cellWidth, imagesPerRow, spacing, padding, width, height);
            }

             
            await this.renderPages(width, height, bgColor);

        } catch (error) {
            console.error('Error generating pages:', error);
            alert('Error generating pages. Please try again.');
        }

        this.generateBtn.innerHTML = 'Generate Pages';
        this.generateBtn.disabled = false;
    }

     
    generateGridPages(cellWidth, imagesPerRow, spacing, padding, pageWidth, pageHeight) {
        let currentPage = [];
        let currentY = padding;
        let currentRowHeight = 0;
        let currentRowImages = [];

        for (const img of this.images) {
            const scale = cellWidth / img.width;
            const scaledHeight = img.height * scale;

             
            if (currentRowImages.length >= imagesPerRow) {
                currentY += currentRowHeight + spacing;
                currentRowHeight = 0;
                currentRowImages = [];
            }

             
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

     
    generateSmartPackedPages(availableWidth, availableHeight, spacing, padding, pageWidth, pageHeight) {
         
         
        const targetRowHeight = availableHeight / 4;  

         
        const preparedImages = this.images.map(img => {
            const aspectRatio = img.width / img.height;
            return {
                ...img,
                displayHeight: targetRowHeight,
                displayWidth: targetRowHeight * aspectRatio
            };
        });

         
        const sortedImages = [...preparedImages].sort((a, b) => b.displayWidth - a.displayWidth);

        const used = new Set();
        let currentPage = [];
        let currentY = padding;

        while (used.size < sortedImages.length) {
             
            const row = [];
            let rowWidth = 0;
            let rowHeight = 0;

             
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

             
            const scaleFactor = availableWidth / rowWidth;
            const scaledRowHeight = rowHeight * scaleFactor;

             
            if (currentY + scaledRowHeight > pageHeight - padding && currentPage.length > 0) {
                 
                this.generatedPages.push([...currentPage]);
                currentPage = [];
                currentY = padding;
            }

             
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

             
            this.canvas.width = width;
            this.canvas.height = height;

             
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(0, 0, width, height);

             
            for (const item of pageImages) {
                this.ctx.drawImage(
                    item.img.element,
                    item.x,
                    item.y,
                    item.width,
                    item.height
                );
            }

             
            const dataUrl = this.canvas.toDataURL('image/png');

             
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

         
        this.pageCount.textContent = this.generatedPages.length;
        this.pagesSection.style.display = 'block';

         
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

             
            this.canvas.width = width;
            this.canvas.height = height;

             
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(0, 0, width, height);

             
            for (const item of pageImages) {
                this.ctx.drawImage(
                    item.img.element,
                    item.x,
                    item.y,
                    item.width,
                    item.height
                );
            }

             
            const dataUrl = this.canvas.toDataURL('image/png');
            this.downloadPage(dataUrl, i + 1);

             
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}

 
document.addEventListener('DOMContentLoaded', () => {
    new ImageCombiner();
});
