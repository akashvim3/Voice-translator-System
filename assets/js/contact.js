// Contact Form Validation
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Clear previous errors
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });

        let isValid = true;

        // Validate name
        const name = document.getElementById('name');
        if (name.value.trim().length < 2) {
            name.closest('.form-group').classList.add('error');
            isValid = false;
        }

        // Validate email
        const email = document.getElementById('email');
        const emailPattern = /^[^s@]+@[^s@]+.[^s@]+$/;
        if (!emailPattern.test(email.value.trim())) {
            email.closest('.form-group').classList.add('error');
            isValid = false;
        }

        // Validate phone (if provided)
        const phone = document.getElementById('phone');
        if (phone.value.trim() !== '') {
            const phonePattern = /^[ds-+()]{10,}$/;
            if (!phonePattern.test(phone.value.trim())) {
                phone.closest('.form-group').classList.add('error');
                isValid = false;
            }
        }

        // Validate subject
        const subject = document.getElementById('subject');
        if (subject.value === '') {
            subject.closest('.form-group').classList.add('error');
            isValid = false;
        }

        // Validate message
        const message = document.getElementById('message');
        if (message.value.trim().length < 10) {
            message.closest('.form-group').classList.add('error');
            isValid = false;
        }

        if (isValid) {
            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Simulate form submission
            setTimeout(() => {
                // Show success message
                successMessage.classList.add('show');

                // Reset form
                contactForm.reset();

                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';

                // Hide success message after 5 seconds
                setTimeout(() => {
                    successMessage.classList.remove('show');
                }, 5000);

                // Scroll to success message
                successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 2000);
        } else {
            // Scroll to first error
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // Real-time validation feedback
    document.querySelectorAll('#contactForm input, #contactForm select, #contactForm textarea').forEach(field => {
        field.addEventListener('blur', function() {
            const formGroup = this.closest('.form-group');
            formGroup.classList.remove('error');

            if (this.hasAttribute('required') && this.value.trim() === '') {
                formGroup.classList.add('error');
            }

            if (this.id === 'email' && this.value.trim() !== '') {
                const emailPattern = /^[^s@]+@[^s@]+.[^s@]+$/;
                if (!emailPattern.test(this.value.trim())) {
                    formGroup.classList.add('error');
                }
            }

            if (this.id === 'phone' && this.value.trim() !== '') {
                const phonePattern = /^[ds-+()]{10,}$/;
                if (!phonePattern.test(this.value.trim())) {
                    formGroup.classList.add('error');
                }
            }

            if (this.id === 'message' && this.value.trim().length > 0 && this.value.trim().length < 10) {
                formGroup.classList.add('error');
            }
        });
    });

