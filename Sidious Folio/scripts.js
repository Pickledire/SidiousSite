const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Set up event propagation through all elements
document.addEventListener('mousemove', function(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

document.addEventListener('mousedown', function(e) {
  isMouseDown = true;
  // Clear previous lightning data when starting a new one
  completedBranches = [];
  startLightningPath();
  // Prevent default behavior to ensure the event is captured
  e.preventDefault();
});

document.addEventListener('mouseup', function() {
  isMouseDown = false;
  // Complete all active lightning paths when mouse is released
  completeAllLightningPaths();
  // Convert all completed branches to residual bolts that will fade
  convertCompletedBranchesToResidualBolts();
});

// Remove original canvas event listeners
canvas.removeEventListener('mousemove', () => {});
canvas.removeEventListener('mousedown', () => {});
canvas.removeEventListener('mouseup', () => {});

const stars = [];
const numStars = 300;
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let activeLightningPaths = []; // Currently growing lightning paths
let residualBolts = []; // Fully formed bolts that are fading
let completedBranches = []; // Completed branches that don't fade while lightning is growing
let lastLightningTime = 0;
const lightningCooldown = 800; // Longer cooldown for better effect

// Initialize stars
for (let i = 0; i < numStars; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    velocity: Math.random() * 0.01 + 0.01,
    alpha: Math.random(),
    twinkle: Math.random() * 0.05 + 0.1
  });
}

// Lightning colors - bright white-blue for realistic look
const MAIN_BOLT_COLOR = 'rgba(235, 235, 255, 0.95)'; // Main Bolt Color
const MAIN_BOLT_GLOW = 'rgba(150, 150, 255, 0.6)'; // Main Bolt Glow
const SECONDARY_COLOR = 'rgba(210, 210, 255, 0.85)'; // Secondary branches
const SECONDARY_GLOW = 'rgba(130, 130, 255, 0.5)'; // Secondary branches glow
const TERTIARY_COLOR = 'rgba(180, 180, 255, 0.75)'; // Tertiary branches
const TERTIARY_GLOW = 'rgba(120, 110, 255, 0.4)'; // Tertiary branches glow

// Lightning animation parameters
const SEGMENT_CREATION_SPEED = 0.7; // Frames per segment creation
const BRANCH_PROBABILITY = 0.1; // Chance to create a branch at each segment
const MAJOR_SPLIT_PROBABILITY = 0.01; // (1% chance)
const MAX_ACTIVE_PATHS = 24; //
const SHARP_TURN_PROBABILITY = 0.13; 
const SEGMENT_LENGTH_MAIN = 9.9;

function drawStars() {
  for (let star of stars) {
    ctx.beginPath();
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = 'white';
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();

    star.y += star.velocity;
    star.alpha += (Math.random() - 0.5) * star.twinkle;
    star.alpha = Math.max(0.1, Math.min(1, star.alpha));

    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  }
  ctx.globalAlpha = 1;
}

// Convert all completed branches to residual bolts
function convertCompletedBranchesToResidualBolts() {
  for (const branch of completedBranches) {
    residualBolts.push({
      segments: [...branch.segments],
      level: branch.level,
      intensity: branch.intensity,
      isMainTrunk: branch.isMainTrunk,
      opacity: 1.0,
      fadeSpeed: 0.0152587890625 + Math.random() * 0.0152587890625
    });
  }
  // Clear the completed branches
  completedBranches = [];
}

// Create and initialize a new lightning path
function startLightningPath() {
  const now = Date.now();
  if (now - lastLightningTime < lightningCooldown) return;
  lastLightningTime = now;
  
  // Generate a target direction (mostly upward)
  const baseAngle = -Math.PI / 2; // Upward
  const angleVariation = (Math.random() * Math.PI / 3) - Math.PI / 6; // -30° to +30°
  const angle = baseAngle + angleVariation;
  
  // Create the main lightning bolt
  activeLightningPaths.push({
    // Starting position
    startX: mouseX,
    startY: mouseY,
    
    // Current position
    currentX: mouseX,
    currentY: mouseY,
    
    // Target direction
    angle: angle,
    targetAngle: angle, // Direction we're generally trying to go
    
    // Segments of the path
    segments: [{x: mouseX, y: mouseY}],
    
    // Lightning properties
    level: 0, // Main bolt is level 0
    intensity: 1.0,
    branchProbability: BRANCH_PROBABILITY,
    majorSplitProbability: MAJOR_SPLIT_PROBABILITY,
    
    // Animation parameters
    segmentLength: SEGMENT_LENGTH_MAIN + Math.random() * 3, // Very short segments for jaggedness
    frameCounter: 0, // For controlling segment creation speed
    
    // Additional properties for natural movement
    jitterFactor: 1.0,
    meanderFactor: 0.45,
    sharpTurnCounter: 0, // Count segments since last sharp turn
    
    // Direction tracking to prevent backtracking
    lastDirection: angle,
    
    // Whether this path is a main trunk branch
    isMainTrunk: true,
    
    // State
    isComplete: false
  });
}

// Complete all active lightning paths
function completeAllLightningPaths() {
  for (let i = activeLightningPaths.length - 1; i >= 0; i--) {
    const path = activeLightningPaths[i];
    path.isComplete = true;
    addToCompletedBranches(path);
    activeLightningPaths.splice(i, 1);
  }
}

// Create a major fork/split in the main lightning bolt
function createMajorSplit(parentPath, segmentIndex) {
  if (activeLightningPaths.length >= MAX_ACTIVE_PATHS) return;
  
  // Get the split start point
  const splitStart = parentPath.segments[segmentIndex];
  
  // Calculate split angle - diverge from parent but not too extremely
  const parentDirection = (segmentIndex > 0) 
    ? Math.atan2(
        parentPath.segments[segmentIndex].y - parentPath.segments[segmentIndex-1].y,
        parentPath.segments[segmentIndex].x - parentPath.segments[segmentIndex-1].x
      )
    : parentPath.angle;
  
  // Split at a moderate angle
  const splitDirection = Math.random() > 0.5 ? 1 : -1;
  const splitAngle = parentDirection + (splitDirection * (Math.PI / 6 + Math.random() * Math.PI / 8));
  
  // Create the new main trunk path
  activeLightningPaths.push({
    startX: splitStart.x,
    startY: splitStart.y,
    currentX: splitStart.x,
    currentY: splitStart.y,
    angle: splitAngle,
    targetAngle: splitAngle,
    lastDirection: splitAngle,
    segments: [{x: splitStart.x, y: splitStart.y}],
    level: 0, // Still level 0 because it's a main trunk
    intensity: parentPath.intensity * 0.9, // Very slightly less intense
    branchProbability: parentPath.branchProbability * 0.8,
    majorSplitProbability: parentPath.majorSplitProbability * 0.5, // Less likely to split again
    segmentLength: parentPath.segmentLength * 0.9,
    frameCounter: 0,
    jitterFactor: parentPath.jitterFactor,
    meanderFactor: parentPath.meanderFactor,
    sharpTurnCounter: 0,
    isMainTrunk: true, // This is a main trunk/branch
    isComplete: false
  });
}

// Create a new branch from an existing path
function createBranch(parentPath, segmentIndex) {
  if (activeLightningPaths.length >= MAX_ACTIVE_PATHS) return;
  
  // Get the branch start point
  const branchStart = parentPath.segments[segmentIndex];
  
  // Calculate branch angle - more perpendicular to parent
  const parentDirection = (segmentIndex > 0) 
    ? Math.atan2(
        parentPath.segments[segmentIndex].y - parentPath.segments[segmentIndex-1].y,
        parentPath.segments[segmentIndex].x - parentPath.segments[segmentIndex-1].x
      )
    : parentPath.angle;
  
  // Branch at a more perpendicular angle
  let branchAngleOffset;
  
  if (parentPath.level === 0) {
    // Main branch: slightly narrower angle range (was PI/3 + PI/4)
    branchAngleOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * Math.PI / 5);
  } else {
    // Sub-branches: narrower angle range
    branchAngleOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + Math.random() * Math.PI / 6);
  }
  
  const branchAngle = parentDirection + branchAngleOffset;
  
  // Branch length based on parent level
  let maxSegments;
  if (parentPath.level === 0) {
    maxSegments = 15 + Math.floor(Math.random() * 10); // Longer branches for main bolt
  } else if (parentPath.level === 1) {
    maxSegments = 8 + Math.floor(Math.random() * 7); // Medium branches for secondary
  } else {
    maxSegments = 4 + Math.floor(Math.random() * 4); // Short branches for tertiary
  }
  
  // Create the branch path
  activeLightningPaths.push({
    startX: branchStart.x,
    startY: branchStart.y,
    currentX: branchStart.x,
    currentY: branchStart.y,
    angle: branchAngle,
    targetAngle: branchAngle,
    lastDirection: branchAngle,
    segments: [{x: branchStart.x, y: branchStart.y}],
    level: parentPath.level + 1,
    intensity: parentPath.intensity * 0.8,
    branchProbability: parentPath.branchProbability * 0.5,
    segmentLength: Math.max(3, parentPath.segmentLength * 0.8),
    frameCounter: 0,
    jitterFactor: parentPath.jitterFactor * 1.3,
    meanderFactor: parentPath.meanderFactor * 1.1,
    sharpTurnCounter: 0,
    maxSegments: maxSegments,
    isMainTrunk: false,
    isComplete: false
  });
}

// Create a zigzagging path
function makeZigzagPath(startX, startY, angle, length, zigzagAmount) {
  const points = [{x: startX, y: startY}];
  let currentX = startX;
  let currentY = startY;
  
  // Create a zigzag effect by alternating between angles
  const zigzagAngle = Math.PI / 4 * zigzagAmount; // 45 degrees * amount
  let currentAngle = angle;
  
  for (let i = 0; i < length; i++) {
    // Alternate zigzag direction
    if (i % 2 === 0) {
      currentAngle = angle + zigzagAngle;
    } else {
      currentAngle = angle - zigzagAngle;
    }
    
    // Move in the current direction
    currentX += Math.cos(currentAngle) * 10;
    currentY += Math.sin(currentAngle) * 10;
    
    points.push({x: currentX, y: currentY});
  }
  
  return points;
}

// Check if an angle would cause a backtrack
function wouldBacktrack(currentDirection, newDirection, threshold = Math.PI * 0.6) {
  const angleDiff = Math.abs(normalizeAngle(newDirection - currentDirection));
  return angleDiff > threshold;
}

// Normalize angle to [-PI, PI]
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

// Update lightning paths (grow them segment by segment)
function updateLightningPaths() {
  // Process each active path
  for (let i = activeLightningPaths.length - 1; i >= 0; i--) {
    const path = activeLightningPaths[i];
    
    // Only add a new segment every few frames
    path.frameCounter++;
    if (path.frameCounter < SEGMENT_CREATION_SPEED) continue;
    path.frameCounter = 0;
    
    // Check if path is already complete
    if (path.isComplete) {
      // Add to completed branches instead of residual bolts
      addToCompletedBranches(path);
      activeLightningPaths.splice(i, 1);
      continue;
    }
    
    // Check if we've reached the maximum number of segments for this path
    if (path.maxSegments && path.segments.length >= path.maxSegments) {
      path.isComplete = true;
      continue;
    }
    
    // Check for major split for main trunks
    if (path.isMainTrunk && path.segments.length > 8 && Math.random() < path.majorSplitProbability) {
      createMajorSplit(path, path.segments.length - 1);
    }
    
    // Increment counter for sharp turns
    path.sharpTurnCounter++;
    
    // Determine if we should make a sharp turn (zigzag)
    let makeSharpTurn = Math.random() < SHARP_TURN_PROBABILITY && path.sharpTurnCounter > 6;
    
    // Calculate the next segment direction
    let segmentAngle;
    
    if (makeSharpTurn) {
      // Make a sharp turn (zigzag pattern)
      const turnDirection = Math.random() > 0.5 ? 1 : -1;
      const turnAmount = (Math.PI / 2) * (0.6 + Math.random() * 0.5); 
      
      // Sharp turn relative to current direction
      const previousSegment = path.segments[path.segments.length - 1];
      const prevSegmentIndex = path.segments.length - 2;
      
      if (prevSegmentIndex >= 0) {
        const prevX = path.segments[prevSegmentIndex].x;
        const prevY = path.segments[prevSegmentIndex].y;
        const currentX = previousSegment.x;
        const currentY = previousSegment.y;
        
        // Calculate current direction
        const currentDirection = Math.atan2(currentY - prevY, currentX - prevX);
        
        // Turn perpendicular to current direction
        const candidateAngle = currentDirection + (turnDirection * turnAmount);
        
        // Avoid turns that would cause the path to double back
        if (wouldBacktrack(path.lastDirection, candidateAngle)) {
          // Reduce the turn amount to avoid backtracking
          segmentAngle = currentDirection + (turnDirection * (turnAmount * 0.5));
        } else {
          segmentAngle = candidateAngle;
        }
      } else {
        // If we don't have enough segments yet, just turn from target angle
        segmentAngle = path.targetAngle + (turnDirection * turnAmount);
      }
      
      // Reset the counter
      path.sharpTurnCounter = 0;
    } else {
      // Normal movement with jitter and meander
      // Gradually try to return to target direction (increased correction factor for more target following)
      const correction = (path.targetAngle - path.angle) * 0.15; // Was 0.1
      path.angle += correction;
      
      // Add jitter (jaggedness)
      const jitter = path.jitterFactor * (Math.random() - 0.5);
      
      // Add meander (gradual direction changes)
      const meander = path.meanderFactor * (Math.random() - 0.5);
      
      // Combined angle for this segment
      segmentAngle = path.angle + jitter + meander;
    }
    
    // Calculate the new position
    const nextX = path.currentX + Math.cos(segmentAngle) * path.segmentLength;
    const nextY = path.currentY + Math.sin(segmentAngle) * path.segmentLength;
    
    // Add the new segment
    path.segments.push({x: nextX, y: nextY});
    path.currentX = nextX;
    path.currentY = nextY;
    
    // Update the current angle and track last direction
    path.angle = segmentAngle;
    path.lastDirection = segmentAngle;
    
    // Check for regular branching
    if (path.level < 2 && path.segments.length > 4 && Math.random() < path.branchProbability) {
      createBranch(path, path.segments.length - 1);
    }
    
    // Check if path is going off-screen
    if (nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height) {
      path.isComplete = true;
    }
  }
  
  // Create new main bolt if needed and clicked
  if (isMouseDown && activeLightningPaths.length === 0 && 
      Date.now() - lastLightningTime > lightningCooldown) {
    startLightningPath();
  }
}

// Add a path to completed branches
function addToCompletedBranches(path) {
  // Skip paths with very few segments
  if (path.segments.length < 3) return;
  
  // Add to completed branches
  completedBranches.push({
    segments: [...path.segments], // Copy segments
    level: path.level,
    intensity: path.intensity,
    isMainTrunk: path.isMainTrunk
  });
}

// Draw lightning paths that are currently growing
function drawLightningPaths() {
  for (const path of activeLightningPaths) {
    if (path.segments.length < 2) continue;
    
    // Select colors based on level
    let mainColor, glowColor;
    if (path.level === 0) {
      mainColor = MAIN_BOLT_COLOR;
      glowColor = MAIN_BOLT_GLOW;
    } else if (path.level === 1) {
      mainColor = SECONDARY_COLOR;
      glowColor = SECONDARY_GLOW;
    } else {
      mainColor = TERTIARY_COLOR;
      glowColor = TERTIARY_GLOW;
    }
    
    // Apply intensity adjustment
    mainColor = mainColor.replace(/[\d.]+\)$/, (path.intensity * 0.9) + ")");
    glowColor = glowColor.replace(/[\d.]+\)$/, (path.intensity * 0.5) + ")");
    
    // Draw the glow (outer layer)
    ctx.beginPath();
    ctx.moveTo(path.segments[0].x, path.segments[0].y);
    for (let i = 1; i < path.segments.length; i++) {
      ctx.lineTo(path.segments[i].x, path.segments[i].y);
    }
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = path.isMainTrunk 
      ? (3.94 - path.level * 0.28) * path.intensity  
      : (3.94 - path.level * 1.13) * path.intensity; 
    ctx.stroke();
    
    // Draw the bright center
    ctx.beginPath();
    ctx.moveTo(path.segments[0].x, path.segments[0].y);
    for (let i = 1; i < path.segments.length; i++) {
      ctx.lineTo(path.segments[i].x, path.segments[i].y);
    }
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = path.isMainTrunk
      ? (2.25 - path.level * 0.17) * path.intensity 
      : (2.25 - path.level * 0.56) * path.intensity;
    ctx.stroke();
  }
}


function drawCompletedBranches() {
  for (const branch of completedBranches) {
    if (branch.segments.length < 2) continue;
    
    // Select colors based on level
    let mainColor, glowColor;
    if (branch.level === 0) {
      mainColor = MAIN_BOLT_COLOR;
      glowColor = MAIN_BOLT_GLOW;
    } else if (branch.level === 1) {
      mainColor = SECONDARY_COLOR;
      glowColor = SECONDARY_GLOW;
    } else {
      mainColor = TERTIARY_COLOR;
      glowColor = TERTIARY_GLOW;
    }
    
    // Draw the glow
    ctx.beginPath();
    ctx.moveTo(branch.segments[0].x, branch.segments[0].y);
    for (let i = 1; i < branch.segments.length; i++) {
      ctx.lineTo(branch.segments[i].x, branch.segments[i].y);
    }
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = branch.isMainTrunk
      ? (3.94 - branch.level * 0.28) * branch.intensity 
      : (3.94 - branch.level * 1.13) * branch.intensity; 
    ctx.stroke();
    
    // Draw the bright center
    ctx.beginPath();
    ctx.moveTo(branch.segments[0].x, branch.segments[0].y);
    for (let i = 1; i < branch.segments.length; i++) {
      ctx.lineTo(branch.segments[i].x, branch.segments[i].y);
    }
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = branch.isMainTrunk
      ? (2.25 - branch.level * 0.17) * branch.intensity  
      : (2.25 - branch.level * 0.56) * branch.intensity; 
    ctx.stroke();
  }
}

// Draw residual bolts (lightning that has finished growing and is fading)
function drawResidualBolts() {
  for (let i = residualBolts.length - 1; i >= 0; i--) {
    const bolt = residualBolts[i];
    
    if (bolt.segments.length < 2) continue;
    
    // Select colors based on level
    let mainColor, glowColor;
    if (bolt.level === 0) {
      mainColor = MAIN_BOLT_COLOR;
      glowColor = MAIN_BOLT_GLOW;
    } else if (bolt.level === 1) {
      mainColor = SECONDARY_COLOR;
      glowColor = SECONDARY_GLOW;
    } else {
      mainColor = TERTIARY_COLOR;
      glowColor = TERTIARY_GLOW;
    }
    
    // Apply opacity
    mainColor = mainColor.replace(/[\d.]+\)$/, (bolt.opacity * 0.9) + ")");
    glowColor = glowColor.replace(/[\d.]+\)$/, (bolt.opacity * 0.5) + ")");
    
    // Draw the glow
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let i = 1; i < bolt.segments.length; i++) {
      ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
    }
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = bolt.isMainTrunk
      ? (3.94 - bolt.level * 0.28) * bolt.opacity
      : (3.94 - bolt.level * 1.13) * bolt.opacity; 
    ctx.stroke();
    
    // Draw the bright center
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let i = 1; i < bolt.segments.length; i++) {
      ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
    }
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = bolt.isMainTrunk
      ? (2.25 - bolt.level * 0.17) * bolt.opacity
      : (2.25 - bolt.level * 0.56) * bolt.opacity;
    ctx.stroke();
    
    // Fade the bolt
    bolt.opacity -= bolt.fadeSpeed;
    
    // Remove faded bolts
    if (bolt.opacity <= 0) {
      residualBolts.splice(i, 1);
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw black background instead of subtle blue/purple gradient
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawStars();
  
  // Draw completed branches (non-fading) first
  drawCompletedBranches();
  
  // Update and draw active lightning
  updateLightningPaths();
  drawLightningPaths();
  
  // Draw fading residual bolts last
  drawResidualBolts();
  
  requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

animate();

// ========================================
// AUTO-SCROLLING FLOATING CAROUSEL
// ========================================
function initCarousel() {
  const carousel = document.getElementById('floatingCarousel');
  if (!carousel) return;
  
  const images = carousel.querySelectorAll('.carousel-image');
  if (images.length === 0) return;
  
  // Clone images for infinite scroll effect
  images.forEach(img => {
    const clone = img.cloneNode(true);
    carousel.appendChild(clone);
  });
  
  // Randomize vertical positions slightly for organic feel
  const allImages = carousel.querySelectorAll('.carousel-image');
  allImages.forEach((img, index) => {
    const randomY = (Math.random() - 0.5) * 60; // -30px to +30px
    const randomRotate = (Math.random() - 0.5) * 8; // -4deg to +4deg
    img.style.setProperty('--random-y', `${randomY}px`);
    img.style.setProperty('--random-rotate', `${randomRotate}deg`);
    img.style.transform = `translateY(calc(var(--random-y, 0px))) rotate(${randomRotate}deg)`;
    
    // Apply depth transforms on top
    const depth = img.dataset.depth;
    if (depth === 'mid') {
      img.style.transform = `translateY(calc(-20px + var(--random-y, 0px))) scale(0.9) rotate(${randomRotate}deg)`;
    } else if (depth === 'back') {
      img.style.transform = `translateY(calc(-40px + var(--random-y, 0px))) scale(0.75) rotate(${randomRotate}deg)`;
    } else {
      img.style.transform = `translateY(var(--random-y, 0px)) scale(1) rotate(${randomRotate}deg)`;
    }
  });
  
  // Animation variables
  let scrollPosition = 0;
  const scrollSpeed = 0.5; // pixels per frame
  let isPaused = false;
  let animationId;
  
  // Calculate total width of original images
  function getCarouselWidth() {
    let totalWidth = 0;
    const gap = 48; // 3rem = 48px
    for (let i = 0; i < images.length; i++) {
      totalWidth += images[i].offsetWidth + gap;
    }
    return totalWidth;
  }
  
  // Animation loop
  function animateCarousel() {
    if (!isPaused) {
      scrollPosition += scrollSpeed;
      
      const halfWidth = getCarouselWidth();
      
      // Reset position for infinite loop
      if (scrollPosition >= halfWidth) {
        scrollPosition = 0;
      }
      
      carousel.style.transform = `translateX(-${scrollPosition}px)`;
    }
    
    animationId = requestAnimationFrame(animateCarousel);
  }
  
  // Pause on hover
  carousel.addEventListener('mouseenter', () => {
    isPaused = true;
  });
  
  carousel.addEventListener('mouseleave', () => {
    isPaused = false;
  });
  
  // Handle touch devices
  carousel.addEventListener('touchstart', () => {
    isPaused = true;
  });
  
  carousel.addEventListener('touchend', () => {
    setTimeout(() => {
      isPaused = false;
    }, 1000);
  });
  
  // Start animation
  animateCarousel();
  
  // Handle carousel resize
  window.addEventListener('resize', () => {
    // Recalculate positions on resize
    scrollPosition = scrollPosition % getCarouselWidth();
  });
}

// Initialize carousel when DOM is ready
document.addEventListener('DOMContentLoaded', initCarousel);