document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('spiralCanvas');
    const ctx = canvas.getContext('2d');
    const iterInput = document.getElementById('iterations');
    const iterValueSpan = document.getElementById('iterValue');

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const CENTER_X = WIDTH / 2;
    const CENTER_Y = HEIGHT / 2;

    // --- Configuration Parameters ---
    const ANGLE_INCREMENT = 89; // Angle in degrees. Use values close to 90 for complex patterns.
    const GROWTH_RATE = 0.015;  // Controls how fast the spiral radius expands (Logarithmic-like scaling)

    function drawSpiral(iterations) {
        // Clear the canvas for a fresh draw
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        
        // Set drawing style
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 1;
        
        // Start drawing from the center point
        let currentX = CENTER_X;
        let currentY = CENTER_Y;
        
        // Initial state for the iterative process
        let angle = 0; // Angle in degrees
        let distance = 0; // Initial length/radius increase

        // Begin path for optimized drawing
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);

        for (let i = 0; i < iterations; i++) {
            // 1. Calculate the new radius/distance based on iteration number
            distance += GROWTH_RATE;
            
            // 2. Convert the current angle (in degrees) to radians for trigonometric functions
            const rad = (angle * Math.PI) / 180;
            
            // 3. Calculate the next point using polar coordinates (r, theta) converted to Cartesian (x, y)
            const nextX = CENTER_X + distance * Math.cos(rad);
            const nextY = CENTER_Y + distance * Math.sin(rad);

            // 4. Draw the line segment
            ctx.lineTo(nextX, nextY);

            // 5. Update state for the next iteration
            angle += ANGLE_INCREMENT;
            
            // Optional: Fading color effect based on depth
            const colorValue = (i / iterations) * 255;
            // ctx.strokeStyle = `rgb(0, ${Math.floor(colorValue)}, 255)`;
        }

        // Render the final path
        ctx.stroke();
    }

    // --- Event Listeners and Initial Draw ---

    iterInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        iterValueSpan.textContent = value;
        drawSpiral(value);
    });

    // Initial draw when the page loads
    drawSpiral(parseInt(iterInput.value));
});