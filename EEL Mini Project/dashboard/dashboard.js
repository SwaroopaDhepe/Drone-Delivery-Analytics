document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loaded');

    const cards = document.querySelectorAll('.card');
    const loader = document.getElementById('loader');

    // Add click event listeners to cards for navigation with transition
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent immediate navigation
            const href = card.getAttribute('href');

            // Show loader
            loader.classList.remove('hidden');

            // Add scale-down animation to card
            card.classList.add('animate-scale-down');

            // Fade out the dashboard
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '0';

            // Navigate to the page after animation
            setTimeout(() => {
                window.location.href = href;
            }, 500);
        });

        // Add hover effect to enhance interactivity
        card.addEventListener('mouseenter', () => {
            card.style.cursor = 'pointer';
        });

        card.addEventListener('mouseleave', () => {
            card.style.cursor = 'default';
        });
    });
});

// Add CSS for scale-down animation dynamically
const style = document.createElement('style');
style.textContent = `
    .animate-scale-down {
        animation: scaleDown 0.5s ease forwards;
    }
    @keyframes scaleDown {
        0% { transform: scale(1); }
        100% { transform: scale(0.95); }
    }
`;
document.head.appendChild(style);