const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn       = document.getElementById('contactSubmitBtn');
    const statusDiv = document.getElementById('contactFormStatus');
    const originalText = btn.textContent;

    // Clear previous status
    statusDiv.textContent = '';
    statusDiv.style.color = '';

    // Gather values
    const firstName = document.getElementById('first_name').value.trim();
    const lastName  = document.getElementById('last_name').value.trim();
    const email     = document.getElementById('email').value.trim();
    const phone     = document.getElementById('phone_number').value.trim();
    const message   = document.getElementById('message').value.trim();

    // Client-side validation
    if (!firstName || !lastName || !email || !phone || !message) {
      statusDiv.textContent = 'Please fill in all required fields.';
      statusDiv.style.color = '#dc2626';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      statusDiv.textContent = 'Please enter a valid email address.';
      statusDiv.style.color = '#dc2626';
      return;
    }

    // Loading state
    btn.textContent = 'Sending...';
    btn.disabled    = true;

    try {
      await publicApiRequest(HC_CONFIG.ENDPOINTS.CONTACT_FORM, {
        method: 'POST',
        body: JSON.stringify({
          first_name:   firstName,
          last_name:    lastName,
          email:        email,
          phone_number: phone,
          message:      message,
        }),
      });

      btn.textContent       = '✓ Message sent!';
      btn.style.background  = '#16a34a';
      statusDiv.textContent = 'Your message has been sent successfully.';
      statusDiv.style.color = '#16a34a';
      contactForm.reset();

    } catch (err) {
      btn.textContent      = '✗ Failed. Please try again.';
      btn.style.background = '#dc2626';

      if (err.status === 400 && err.data) {
        const messages = [];
        for (const [field, errors] of Object.entries(err.data)) {
          const fieldName = field.replace(/_/g, ' ');
          if (Array.isArray(errors)) {
            messages.push(fieldName + ': ' + errors.join(', '));
          } else if (typeof errors === 'string') {
            messages.push(fieldName + ': ' + errors);
          }
        }
        statusDiv.textContent = messages.length > 0
          ? messages.join(' | ')
          : 'Please check your input and try again.';
      } else if (err.status >= 500) {
        statusDiv.textContent = 'Our server is temporarily unavailable. Please try again later.';
      } else {
        statusDiv.textContent = err.message || 'Something went wrong. Please try again.';
      }
      statusDiv.style.color = '#dc2626';

    } finally {
      setTimeout(() => {
        btn.textContent      = originalText;
        btn.style.background = '';
        btn.disabled         = false;
      }, 3000);
    }
  });
}
