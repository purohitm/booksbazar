document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.lock-toggle').forEach(function(toggle) {
    toggle.addEventListener('change', function() {
      var bookId = this.getAttribute('data-book-id');
      var form = document.getElementById('lockQuestionForm-' + bookId);
      if (!form) return;
      if (this.checked) {
        form.style.display = 'block';
        form.style.maxHeight = '0px';
        setTimeout(function() {
          form.style.transition = 'max-height 0.4s ease';
          form.style.maxHeight = '300px';
        }, 10);
      } else {
        form.style.transition = 'max-height 0.4s ease';
        form.style.maxHeight = '0px';
        setTimeout(function() {
          form.style.display = 'none';
        }, 400);
      }
    });
  });
  // Optional: Hide form after submit
  document.querySelectorAll('.lock-question-form').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      // Intercept form submission to handle AJAX and UI update
      e.preventDefault();
      var formData = new FormData(form);
      var bookId = formData.get('bookId');
      var question = formData.get('question');
      var answer = formData.get('answer');
      var toggle = document.querySelector('.lock-toggle[data-book-id="' + bookId + '"]');
      // Remove any previous error message
      var prevError = form.querySelector('.lock-error-msg');
      if (prevError) prevError.remove();
      if (!question || !answer) {
        var errorMsg = document.createElement('div');
        errorMsg.className = 'alert alert-danger mt-2 lock-error-msg';
        errorMsg.textContent = 'Please enter both a question and an answer.';
        form.appendChild(errorMsg);
        if (toggle) toggle.checked = false;
        return;
      }
      fetch('/challenges/create', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.message) {
          // Show success message, hide form, update UI
          form.style.display = 'none';
          var card = form.closest('.card-body');
          if (card) {
            var successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success mt-2';
            successMsg.innerHTML = '<i class="fas fa-check-circle me-2"></i> Challenge created and book locked!';
            card.insertBefore(successMsg, card.firstChild);
          }
          setTimeout(function() { window.location.reload(); }, 1200);
        } else {
          var errorMsg = document.createElement('div');
          errorMsg.className = 'alert alert-danger mt-2 lock-error-msg';
          errorMsg.textContent = data.error || 'Failed to create challenge.';
          form.appendChild(errorMsg);
          if (toggle) toggle.checked = false; // Revert toggle if failed
        }
      })
      .catch(() => {
        var errorMsg = document.createElement('div');
        errorMsg.className = 'alert alert-danger mt-2 lock-error-msg';
        errorMsg.textContent = 'Failed to create challenge.';
        form.appendChild(errorMsg);
        if (toggle) toggle.checked = false; // Revert toggle if failed
      });
    });
  });

  // Handle Remove Lock button (form POST)
  document.querySelectorAll('form[action^="/challenges/remove/"]').forEach(function(form) {
    form.addEventListener('submit', function() {
      setTimeout(function() { window.location.reload(); }, 500);
    });
  });
}); 