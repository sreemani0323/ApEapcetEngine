/**
 * Validation popup system for the College Predictor frontend.
 * Provides a consistent way to display error, warning, and informational messages
 * to users throughout the application.
 * 
 * This module creates and manages modal dialogs for user notifications,
 * with different styling based on message type (error, warning, success, info).
 */

/**
 * Creates the validation modal element if it doesn't already exist.
 * This function ensures only one modal is created per page load.
 */
function createValidationModal() {
    if (document.getElementById('validation-modal')) return;
    
    const modalHTML = `
        <div id="validation-modal" class="validation-modal" style="display: none;">
            <div class="validation-modal-content">
                <div class="validation-modal-header">
                    <i class="validation-icon fas fa-info-circle"></i>
                    <h3 id="validation-modal-title" class="validation-modal-title">Notification</h3>
                    <button class="validation-modal-close" onclick="closeValidationModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="validation-modal-body">
                    <p id="validation-modal-message" class="validation-modal-message">Message</p>
                </div>
                <div class="validation-modal-footer">
                    <button class="btn-primary" onclick="closeValidationModal()">OK</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Displays a validation modal with the specified title, message, and type.
 * 
 * @param {string} title - The title to display in the modal header
 * @param {string} message - The message to display in the modal body
 * @param {string} type - The type of message (error, warning, success, info)
 */
function showValidationModal(title, message, type = 'info') {
    createValidationModal();
    
    const modal = document.getElementById('validation-modal');
    const titleEl = document.getElementById('validation-modal-title');
    const messageEl = document.getElementById('validation-modal-message');
    const icon = modal.querySelector('.validation-icon');
    
    titleEl.textContent = title;
    messageEl.textContent = message;

    icon.className = 'validation-icon fas ';
    switch(type) {
        case 'error':
            icon.classList.add('fa-exclamation-circle');
            icon.style.color = '#e74c3c';
            break;
        case 'warning':
            icon.classList.add('fa-exclamation-triangle');
            icon.style.color = '#f39c12';
            break;
        case 'success':
            icon.classList.add('fa-check-circle');
            icon.style.color = '#27ae60';
            break;
        default:
            icon.classList.add('fa-info-circle');
            icon.style.color = '#3498db';
    }
    
    modal.style.display = 'flex';
}

/**
 * Closes the validation modal by hiding it.
 */
function closeValidationModal() {
    const modal = document.getElementById('validation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Predefined validation messages for common scenarios in the application.
 * Provides consistent messaging and reduces duplication of message strings.
 */
const ValidationMessages = {
    invalidRank: {
        title: 'Invalid Rank',
        message: 'Please enter a valid positive rank (e.g., 15000). Rank must be greater than 0.',
        type: 'error'
    },
    noInput: {
        title: 'Input Required',
        message: 'Please enter your EAMCET rank or select at least one filter to get predictions.',
        type: 'warning'
    },
    noComparison: {
        title: 'Select Colleges',
        message: 'Please select at least 2 colleges to compare. Check the comparison boxes on college cards.',
        type: 'warning'
    },
    backendError: {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        type: 'error'
    },
    dataLoadFailed: {
        title: 'Data Load Failed',
        message: 'Failed to load college data. The server might be temporarily unavailable. Please try again later.',
        type: 'error'
    },
    noResults: {
        title: 'No Results Found',
        message: 'No colleges match your criteria. Try adjusting your filters or rank.',
        type: 'info'
    },
    emptySearch: {
        title: 'Empty Search',
        message: 'Please enter a search term to find colleges.',
        type: 'warning'
    },
    comparisonLimit: {
        title: 'Comparison Limit Reached',
        message: 'You can only compare up to 6 colleges at a time. Please uncheck a college to add another.',
        type: 'warning'
    },
    invalidSelection: {
        title: 'Invalid Selection',
        message: 'Please make a valid selection before proceeding.',
        type: 'warning'
    }
};

// Make functions globally available for inline event handlers
window.showValidationModal = showValidationModal;
window.closeValidationModal = closeValidationModal;
window.ValidationMessages = ValidationMessages;