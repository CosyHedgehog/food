// Food items array - will be loaded from JSON
let foodItems = [];

// Initialize the app
async function init() {
    try {
        // Load images list from JSON file
        const response = await fetch('images.json');
        if (!response.ok) {
            throw new Error('Failed to load images.json');
        }
        foodItems = await response.json();
        
        // Initialize gallery view (main view)
        initGalleryView();
        
        // Initialize tier list view (secondary view)
        initTierListView();
    } catch (error) {
        console.error('Error loading images:', error);
        const galleryContainer = document.getElementById('gallery-container');
        if (galleryContainer) {
            galleryContainer.innerHTML = '<div style="color: #ff6b6b; padding: 20px; text-align: center;">Error loading images. Please run "node generate-images.js" to generate the images list.</div>';
        }
    }
}

// Initialize gallery view
function initGalleryView() {
    const galleryContainer = document.getElementById('gallery-container');
    galleryContainer.innerHTML = '';

    // Create a shuffled copy of food items
    const shuffledFoodItems = [...foodItems];
    for (let i = shuffledFoodItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledFoodItems[i], shuffledFoodItems[j]] = [shuffledFoodItems[j], shuffledFoodItems[i]];
    }

    // Create food items in gallery using shuffled order
    shuffledFoodItems.forEach(item => {
        const foodElement = createFoodItem(item, false, true); // false = not draggable, true = is gallery
        galleryContainer.appendChild(foodElement);
    });
}

// Save tier list state to localStorage
function saveTierListState() {
    const state = {};
    
    // Get all tier contents
    const tierContents = document.querySelectorAll('#tier-list-view .tier-content');
    tierContents.forEach(tierContent => {
        const tier = tierContent.dataset.tier;
        const items = [];
        tierContent.querySelectorAll('.food-item').forEach(item => {
            items.push(parseInt(item.dataset.itemId));
        });
        if (items.length > 0) {
            state[tier] = items;
        }
    });
    
    // Get unranked items
    const unrankedContainer = document.getElementById('unranked-container');
    if (unrankedContainer) {
        const unrankedItems = [];
        unrankedContainer.querySelectorAll('.food-item').forEach(item => {
            unrankedItems.push(parseInt(item.dataset.itemId));
        });
        if (unrankedItems.length > 0) {
            state.unranked = unrankedItems;
        }
    }
    
    localStorage.setItem('tierListState', JSON.stringify(state));
}

// Load tier list state from localStorage
function loadTierListState() {
    try {
        const savedState = localStorage.getItem('tierListState');
        if (savedState) {
            return JSON.parse(savedState);
        }
    } catch (e) {
        console.error('Error loading tier list state:', e);
    }
    return null;
}

// Initialize tier list view
function initTierListView() {
    const unrankedContainer = document.getElementById('unranked-container');
    if (!unrankedContainer) return;
    
    // Clear all tier contents and unranked
    document.querySelectorAll('#tier-list-view .tier-content').forEach(tierContent => {
        tierContent.innerHTML = '';
    });
    unrankedContainer.innerHTML = '';
    
    // Load saved state
    const savedState = loadTierListState();
    
    if (savedState) {
        // Restore items to their saved tiers
        Object.keys(savedState).forEach(tier => {
            const itemIds = savedState[tier];
            
            if (tier === 'unranked') {
                // Add items to unranked
                itemIds.forEach(itemId => {
                    const item = foodItems.find(f => f.id === itemId);
                    if (item) {
                        const foodElement = createFoodItem(item, true, false);
                        unrankedContainer.appendChild(foodElement);
                    }
                });
            } else {
                // Add items to their tier
                const tierContent = document.querySelector(`#tier-list-view .tier-content[data-tier="${tier}"]`);
                if (tierContent) {
                    itemIds.forEach(itemId => {
                        const item = foodItems.find(f => f.id === itemId);
                        if (item) {
                            const foodElement = createFoodItem(item, true, false);
                            tierContent.appendChild(foodElement);
                        }
                    });
                }
            }
        });
        
        // Add any items that weren't in the saved state to unranked
        const allPlacedIds = new Set();
        Object.values(savedState).forEach(itemIds => {
            itemIds.forEach(id => allPlacedIds.add(id));
        });
        
        foodItems.forEach(item => {
            if (!allPlacedIds.has(item.id)) {
                const foodElement = createFoodItem(item, true, false);
                unrankedContainer.appendChild(foodElement);
            }
        });
    } else {
        // No saved state, start with all items in unranked
        foodItems.forEach(item => {
            const foodElement = createFoodItem(item, true, false);
            unrankedContainer.appendChild(foodElement);
        });
    }
}

// Create a food item element
function createFoodItem(item, draggable = false, isGallery = false) {
    const div = document.createElement('div');
    div.className = isGallery ? 'food-item gallery-food-item' : 'food-item';
    div.draggable = draggable;
    div.dataset.itemId = item.id;
    div.dataset.itemName = item.name;
    div.dataset.itemDescription = item.description || 'No description available.';
    
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.draggable = false;
    
    div.appendChild(img);
    
    // Add title for gallery items
    if (isGallery) {
        const title = document.createElement('div');
        title.className = 'food-item-title';
        title.textContent = item.name;
        div.appendChild(title);
    }
    
    // Add click event to open modal
    let wasDragged = false;
    
    if (draggable) {
        div.addEventListener('dragstart', (e) => {
            wasDragged = true;
            handleDragStart(e);
        });
        
        div.addEventListener('dragend', (e) => {
            handleDragEnd(e);
            // Reset after a short delay to allow click event to check the flag
            setTimeout(() => {
                wasDragged = false;
            }, 100);
        });
        
        div.style.cursor = 'grab';
    } else {
        div.style.cursor = 'pointer';
    }
    
    div.addEventListener('click', (e) => {
        // Only open modal if it wasn't a drag operation
        if (!wasDragged) {
            openModal(item);
        }
    });
    
    return div;
}

// Drag and drop functions
function allowDrop(ev) {
    ev.preventDefault();
}

function handleDragStart(ev) {
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/html', ev.target.outerHTML);
    ev.dataTransfer.setData('text/plain', ev.target.dataset.itemId);
    ev.target.classList.add('dragging');
    
    // Add drag-over class to all tier rows
    document.querySelectorAll('.tier-row').forEach(row => {
        row.classList.add('drag-over');
    });
    
    // Add drag-over class to unranked container
    const unrankedContainer = document.getElementById('unranked-container');
    unrankedContainer.classList.add('drag-over');
}

function handleDragEnd(ev) {
    ev.target.classList.remove('dragging');
    
    // Remove drag-over class from all tier rows
    document.querySelectorAll('.tier-row').forEach(row => {
        row.classList.remove('drag-over');
    });
    
    document.querySelectorAll('.tier-content').forEach(content => {
        content.classList.remove('drag-over');
    });
    
    // Remove drag-over class from unranked container
    const unrankedContainer = document.getElementById('unranked-container');
    unrankedContainer.classList.remove('drag-over');
}

function drop(ev) {
    ev.preventDefault();
    
    const itemId = ev.dataTransfer.getData('text/plain');
    const dropTarget = ev.currentTarget;
    
    // Find the dragged element within the tier list view only
    const draggedElement = document.querySelector(`#tier-list-view .food-item[data-item-id="${itemId}"]`);
    
    if (!draggedElement) return;
    
    // Remove empty tier message if it exists (only for tier-content)
    if (dropTarget.classList.contains('tier-content')) {
        const emptyMessage = dropTarget.querySelector('.empty-tier');
        if (emptyMessage) {
            emptyMessage.remove();
        }
    }
    
    // Get item data before removing
    const itemData = {
        id: parseInt(draggedElement.dataset.itemId),
        name: draggedElement.dataset.itemName,
        image: draggedElement.querySelector('img').src,
        description: draggedElement.dataset.itemDescription || 'No description available.'
    };
    
    // Remove the dragged element from its current location (unranked or tier)
    draggedElement.remove();
    
    // Create a new tier-size food item (not gallery size)
    const newElement = createFoodItem(itemData, true, false); // draggable=true, isGallery=false
    
    dropTarget.appendChild(newElement);
    
    // If dropped in unranked, refresh the unranked list to remove duplicates
    if (dropTarget.id === 'unranked-container') {
        // Remove any duplicates (shouldn't happen, but just in case)
        const allUnranked = dropTarget.querySelectorAll('.food-item');
        const seenIds = new Set();
        allUnranked.forEach(item => {
            const id = parseInt(item.dataset.itemId);
            if (seenIds.has(id)) {
                item.remove();
            } else {
                seenIds.add(id);
            }
        });
    }
    
    // Save state to localStorage
    saveTierListState();
    
    // Clean up drag classes
    handleDragEnd({ target: newElement });
}

// Add visual feedback for drag over
document.querySelectorAll('.tier-content').forEach(content => {
    content.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        content.classList.add('drag-over');
    });
    
    content.addEventListener('dragleave', (ev) => {
        content.classList.remove('drag-over');
    });
    
    content.addEventListener('drop', (ev) => {
        content.classList.remove('drag-over');
    });
});

// Modal functions
function openModal(item) {
    const modal = document.getElementById('food-modal');
    const modalImage = document.getElementById('modal-image');
    const modalName = document.getElementById('modal-name');
    const modalDescription = document.getElementById('modal-description');
    
    modalImage.src = item.image;
    modalImage.alt = item.name;
    modalName.textContent = item.name;
    modalDescription.textContent = item.description || 'No description available.';
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('food-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Random food selection function
function selectRandomFood() {
    // Only work in gallery view
    if (!document.getElementById('gallery-view').classList.contains('active')) {
        return;
    }

    const galleryItems = document.querySelectorAll('.gallery-food-item');
    if (galleryItems.length === 0) return;

    // Remove previous selection highlight
    document.querySelectorAll('.gallery-food-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    // Select random item
    const randomIndex = Math.floor(Math.random() * galleryItems.length);
    const selectedItem = galleryItems[randomIndex];

    // Add selection class for animation
    selectedItem.classList.add('selected');

    // Scroll to selected item
    selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
    });

    // Remove selection after animation
    setTimeout(() => {
        selectedItem.classList.remove('selected');
    }, 2000);
}

// View switching functions
function showGalleryView() {
    document.getElementById('gallery-view').classList.add('active');
    document.getElementById('tier-list-view').classList.remove('active');
    document.body.classList.remove('tier-list-view');
}

function showTierListView() {
    document.getElementById('gallery-view').classList.remove('active');
    document.getElementById('tier-list-view').classList.add('active');
    document.body.classList.add('tier-list-view');
    // Reinitialize tier list view to ensure items are loaded
    initTierListView();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // View navigation buttons
    const tierListBtn = document.getElementById('tier-list-btn');
    const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
    const randomFoodBtn = document.getElementById('random-food-btn');

    if (tierListBtn) {
        tierListBtn.addEventListener('click', showTierListView);
    }

    if (backToGalleryBtn) {
        backToGalleryBtn.addEventListener('click', showGalleryView);
    }

    if (randomFoodBtn) {
        randomFoodBtn.addEventListener('click', selectRandomFood);
    }
    
    // Add visual feedback for unranked container
    const unrankedContainer = document.getElementById('unranked-container');
    if (unrankedContainer) {
        unrankedContainer.addEventListener('dragover', (ev) => {
            ev.preventDefault();
            unrankedContainer.classList.add('drag-over');
        });
        
        unrankedContainer.addEventListener('dragleave', (ev) => {
            unrankedContainer.classList.remove('drag-over');
        });
        
        unrankedContainer.addEventListener('drop', (ev) => {
            unrankedContainer.classList.remove('drag-over');
        });
    }
    
    // Modal close handlers
    const modal = document.getElementById('food-modal');
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
});
