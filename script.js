class FeatureManager {
    constructor() {
        this.features = [];
        this.currentVersion = '1.0.0';
        this.editingFeatureId = null;
        this.activeUsers = new Set();
        this.userId = this.generateUserId();
        this.isOnline = false;
        
        this.initializeApp();
        this.bindEvents();
        this.initializeFirebase();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    async initializeFirebase() {
        try {
            // Listen for real-time updates to features
            db.collection('features').onSnapshot((snapshot) => {
                this.features = [];
                snapshot.forEach((doc) => {
                    this.features.push({ id: doc.id, ...doc.data() });
                });
                this.renderFeatures();
                this.updateConnectionStatus('Connected', 'success');
            }, (error) => {
                console.error('Error listening to features:', error);
                this.updateConnectionStatus('Connection Error', 'error');
            });

            // Listen for real-time updates to version
            db.collection('settings').doc('version').onSnapshot((doc) => {
                if (doc.exists) {
                    this.currentVersion = doc.data().version;
                    document.getElementById('versionNumber').textContent = this.currentVersion;
                }
            });

            // Listen for active users
            db.collection('activeUsers').onSnapshot((snapshot) => {
                this.activeUsers.clear();
                snapshot.forEach((doc) => {
                    if (doc.id !== this.userId) {
                        this.activeUsers.add(doc.data().name);
                    }
                });
                this.updateUserCount();
            });

            // Add current user to active users
            await db.collection('activeUsers').doc(this.userId).set({
                name: `User ${this.userId.slice(-4)}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Set up user cleanup on page unload
            window.addEventListener('beforeunload', () => {
                db.collection('activeUsers').doc(this.userId).delete();
            });

            // Load initial data
            const featuresSnapshot = await db.collection('features').get();
            this.features = [];
            featuresSnapshot.forEach((doc) => {
                this.features.push({ id: doc.id, ...doc.data() });
            });

            const versionDoc = await db.collection('settings').doc('version').get();
            if (versionDoc.exists) {
                this.currentVersion = versionDoc.data().version;
            }

            this.renderFeatures();
            this.updateConnectionStatus('Connected', 'success');

        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.updateConnectionStatus('Connection Failed', 'error');
        }
    }

    updateConnectionStatus(status, type) {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = status;
        statusElement.className = `status-indicator ${type}`;
        this.isOnline = type === 'success';
    }

    updateUserCount() {
        const userCountElement = document.getElementById('activeUsers');
        userCountElement.textContent = this.activeUsers.size + 1; // +1 for current user
    }

    initializeApp() {
        // Set initial version
        document.getElementById('versionNumber').textContent = this.currentVersion;
        
        // Show empty state if no features
        if (this.features.length === 0) {
            this.showEmptyState();
        }
    }

    bindEvents() {
        // Version editing
        const versionNumber = document.getElementById('versionNumber');
        versionNumber.addEventListener('blur', (e) => this.saveVersion(e.target.textContent));
        versionNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });

        // Add feature button
        document.getElementById('addFeatureBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('featureForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Close modal when clicking outside
        document.getElementById('featureModal').addEventListener('click', (e) => {
            if (e.target.id === 'featureModal') {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async saveVersion(version) {
        this.currentVersion = version;
        
        try {
            await db.collection('settings').doc('version').set({
                version: version,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Add visual feedback
            const versionElement = document.getElementById('versionNumber');
            versionElement.style.transform = 'scale(1.05)';
            setTimeout(() => {
                versionElement.style.transform = 'scale(1)';
            }, 200);
        } catch (error) {
            console.error('Error saving version:', error);
            this.showNotification('Failed to save version', 'error');
        }
    }

    openModal(featureId = null) {
        this.editingFeatureId = featureId;
        const modal = document.getElementById('featureModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('featureForm');

        if (featureId) {
            // Editing existing feature
            const feature = this.features.find(f => f.id === featureId);
            if (feature) {
                modalTitle.textContent = 'Edit Feature';
                this.populateForm(feature);
            }
        } else {
            // Adding new feature
            modalTitle.textContent = 'Add New Feature';
            form.reset();
        }

        modal.style.display = 'block';
        document.getElementById('featureName').focus();
    }

    closeModal() {
        document.getElementById('featureModal').style.display = 'none';
        this.editingFeatureId = null;
        document.getElementById('featureForm').reset();
    }

    populateForm(feature) {
        document.getElementById('featureName').value = feature.name;
        document.getElementById('featureSize').value = feature.size || 'N/A';
        document.getElementById('engManager').value = feature.engManager || 'N/A';
        document.getElementById('prdLink').value = feature.prdLink || '';
        document.getElementById('designLink').value = feature.designLink || '';
        document.getElementById('featureComments').value = feature.comments || '';
        document.getElementById('featureStatus').value = feature.status;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const featureData = {
            name: formData.get('featureName'),
            size: formData.get('featureSize'),
            engManager: formData.get('engManager'),
            prdLink: formData.get('prdLink'),
            designLink: formData.get('designLink'),
            comments: formData.get('featureComments'),
            status: parseInt(formData.get('featureStatus'))
        };

        if (this.editingFeatureId) {
            // Update existing feature
            this.updateFeature(this.editingFeatureId, featureData);
        } else {
            // Add new feature
            this.addFeature(featureData);
        }

        this.closeModal();
    }

    async addFeature(featureData) {
        try {
            const newFeature = {
                ...featureData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.userId
            };

            const docRef = await db.collection('features').add(newFeature);
            
            // Show success message
            this.showNotification('Feature added successfully!', 'success');
        } catch (error) {
            console.error('Error adding feature:', error);
            this.showNotification('Failed to add feature', 'error');
        }
    }

    async updateFeature(featureId, featureData) {
        try {
            await db.collection('features').doc(featureId).update({
                ...featureData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.userId
            });
            
            this.showNotification('Feature updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating feature:', error);
            this.showNotification('Failed to update feature', 'error');
        }
    }

    async deleteFeature(featureId) {
        if (confirm('Are you sure you want to delete this feature?')) {
            try {
                await db.collection('features').doc(featureId).delete();
                this.showNotification('Feature deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting feature:', error);
                this.showNotification('Failed to delete feature', 'error');
            }
        }
    }

    renderFeatures() {
        const container = document.getElementById('featuresContainer');
        
        if (this.features.length === 0) {
            this.showEmptyState();
            return;
        }

        // Group features by status
        const featuresByStatus = {
            0: [],
            1: [],
            2: [],
            3: [],
            4: []
        };

        this.features.forEach(feature => {
            featuresByStatus[feature.status].push(feature);
        });

        // Create column layout
        container.innerHTML = `
            <div class="kanban-board">
                <div class="kanban-column">
                    <h3 class="column-title">Nothing happened yet</h3>
                    <div class="column-content" data-status="0">
                        ${featuresByStatus[0].map(feature => this.createFeatureCard(feature)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <h3 class="column-title">2 pager was created</h3>
                    <div class="column-content" data-status="1">
                        ${featuresByStatus[1].map(feature => this.createFeatureCard(feature)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <h3 class="column-title">Size was set and TDS opened</h3>
                    <div class="column-content" data-status="2">
                        ${featuresByStatus[2].map(feature => this.createFeatureCard(feature)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <h3 class="column-title">PRD ready</h3>
                    <div class="column-content" data-status="3">
                        ${featuresByStatus[3].map(feature => this.createFeatureCard(feature)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <h3 class="column-title">Tech design ready</h3>
                    <div class="column-content" data-status="4">
                        ${featuresByStatus[4].map(feature => this.createFeatureCard(feature)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Bind events to newly created elements
        this.bindFeatureEvents();
    }

    createFeatureCard(feature) {
        const statusText = this.getStatusText(feature.status);
        const statusClass = `status-${feature.status}`;
        const sizeClass = this.getSizeClass(feature.size);
        const managerClass = this.getManagerClass(feature.engManager);
        
        // Check if feature is completed (all fields filled and status is 4)
        const isCompleted = this.isFeatureCompleted(feature);
        const completedClass = isCompleted ? 'completed-feature' : '';
        
        return `
            <div class="feature-card ${managerClass} ${completedClass}" data-feature-id="${feature.id}">
                <div class="feature-header">
                    <h3 class="feature-name">${this.escapeHtml(feature.name)}</h3>
                    <div class="feature-actions">
                        <button class="action-btn edit-btn" title="Edit feature">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" title="Delete feature">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="feature-meta">
                    <div class="feature-size ${sizeClass}">
                        <i class="fas fa-ruler"></i>
                        ${this.escapeHtml(feature.size || 'N/A')}
                    </div>
                    <div class="feature-manager ${managerClass}">
                        <i class="fas fa-user-tie"></i>
                        ${this.escapeHtml(feature.engManager || 'N/A')}
                    </div>
                </div>
                
                <div class="feature-links">
                    ${feature.prdLink ? `
                        <div class="link-item">
                            <i class="fas fa-file-alt link-icon"></i>
                            <a href="${this.escapeHtml(feature.prdLink)}" target="_blank" rel="noopener noreferrer">
                                PRD Document
                            </a>
                        </div>
                    ` : ''}
                    
                    ${feature.designLink ? `
                        <div class="link-item">
                            <i class="fas fa-palette link-icon"></i>
                            <a href="${this.escapeHtml(feature.designLink)}" target="_blank" rel="noopener noreferrer">
                                Design Mockup
                            </a>
                        </div>
                    ` : ''}
                </div>
                
                ${feature.comments ? `
                    <div class="feature-comments">
                        <h4><i class="fas fa-comment"></i> Comments</h4>
                        <p>${this.escapeHtml(feature.comments)}</p>
                    </div>
                ` : ''}
                
                <div class="feature-status ${statusClass}">
                    <i class="fas ${this.getStatusIcon(feature.status)}"></i>
                    ${statusText}
                </div>
            </div>
        `;
    }

    bindFeatureEvents() {
        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const featureId = e.target.closest('.feature-card').dataset.featureId;
                this.openModal(featureId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const featureId = e.target.closest('.feature-card').dataset.featureId;
                this.deleteFeature(featureId);
            });
        });
    }

    showEmptyState() {
        const container = document.getElementById('featuresContainer');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <h3>No features yet</h3>
                <p>Get started by adding your first feature to this version.</p>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            0: 'Nothing happened yet',
            1: '2 pager was created',
            2: 'Size was set and TDS opened',
            3: 'PRD ready',
            4: 'Tech design ready'
        };
        return statusMap[status] || 'Unknown';
    }

    getStatusIcon(status) {
        const iconMap = {
            0: 'fa-circle',
            1: 'fa-file-alt',
            2: 'fa-tasks',
            3: 'fa-check-circle',
            4: 'fa-code'
        };
        return iconMap[status] || 'fa-question-circle';
    }

    getSizeClass(size) {
        const sizeMap = {
            'N/A': 'size-na',
            'S': 'size-s',
            'M': 'size-m',
            'L': 'size-l',
            'XL': 'size-xl'
        };
        return sizeMap[size] || 'size-na';
    }

    getManagerClass(manager) {
        const managerMap = {
            'N/A': 'manager-na',
            'Omer': 'manager-omer',
            'Tom': 'manager-tom',
            'Liad': 'manager-liad',
            'Tom + Liad': 'manager-tom-liad',
            'Omer + Liad': 'manager-omer-liad'
        };
        return managerMap[manager] || 'manager-na';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#c6f6d5' : '#bee3f8'};
            color: ${type === 'success' ? '#38a169' : '#3182ce'};
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    isFeatureCompleted(feature) {
        // Check if all required fields are filled and status is "Tech design ready" (4)
        return feature.status === 4 && 
               feature.name && 
               feature.name.trim() !== '' &&
               feature.size && 
               feature.size !== 'N/A' &&
               feature.engManager && 
               feature.engManager !== 'N/A' &&
               feature.prdLink && 
               feature.prdLink.trim() !== '' &&
               feature.designLink && 
               feature.designLink.trim() !== '' &&
               feature.comments && 
               feature.comments.trim() !== '';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FeatureManager();
}); 