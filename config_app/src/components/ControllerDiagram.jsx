import { useState } from 'react';

/**
 * ControllerDiagram - Interactive dual-analog gamepad visualization
 * 
 * SVG-based controller with clickable regions for each input.
 * Sticks show a submenu for selecting X-axis, Y-axis, or Click.
 */

// Button/input definitions with their visual positions
const CONTROLLER_INPUTS = {
  // Face buttons (right side)
  xb_button_a: { label: 'A', type: 'face', color: '#10B981' },
  xb_button_b: { label: 'B', type: 'face', color: '#EF4444' },
  xb_button_x: { label: 'X', type: 'face', color: '#3B82F6' },
  xb_button_y: { label: 'Y', type: 'face', color: '#F59E0B' },
  // D-Pad
  xb_dpad_up: { label: '↑', type: 'dpad' },
  xb_dpad_down: { label: '↓', type: 'dpad' },
  xb_dpad_left: { label: '←', type: 'dpad' },
  xb_dpad_right: { label: '→', type: 'dpad' },
  // Shoulders
  xb_left_bumper: { label: 'LB', type: 'shoulder' },
  xb_right_bumper: { label: 'RB', type: 'shoulder' },
  xb_left_trigger: { label: 'LT', type: 'trigger', isAnalog: true },
  xb_right_trigger: { label: 'RT', type: 'trigger', isAnalog: true },
  // Sticks
  xb_left_stick_button: { label: 'L3', type: 'stick_click' },
  xb_right_stick_button: { label: 'R3', type: 'stick_click' },
  xb_left_stick_x: { label: 'L Stick X', type: 'stick_axis', isAnalog: true },
  xb_left_stick_y: { label: 'L Stick Y', type: 'stick_axis', isAnalog: true },
  xb_right_stick_x: { label: 'R Stick X', type: 'stick_axis', isAnalog: true },
  xb_right_stick_y: { label: 'R Stick Y', type: 'stick_axis', isAnalog: true },
  // Menu
  xb_menu: { label: 'Menu', type: 'menu' },
  xb_view: { label: 'View', type: 'menu' },
  xb_home: { label: 'Home', type: 'menu' },
};

// Stick submenu component
function StickSubmenu({ side, onSelect, onClose, accentColor }) {
  const isLeft = side === 'left';
  const prefix = isLeft ? 'xb_left_stick' : 'xb_right_stick';
  
  const options = [
    { id: `${prefix}_x`, label: 'X Axis', icon: '↔' },
    { id: `${prefix}_y`, label: 'Y Axis', icon: '↕' },
    { id: `${prefix}_button`, label: 'Click', icon: '⏺' },
  ];

  return (
    <div 
      className="absolute bg-[#CCCCCC] rounded-xl shadow-xl border border-[#A0A0A0] p-2 min-w-[140px] animate-scale-in"
      style={{ 
        top: '50%', 
        left: isLeft ? '100%' : 'auto',
        right: isLeft ? 'auto' : '100%',
        transform: 'translateY(-50%)',
        marginLeft: isLeft ? '12px' : 0,
        marginRight: isLeft ? 0 : '12px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="text-[10px] font-semibold text-[#707070] uppercase tracking-wider px-2 py-1 mb-1"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {isLeft ? 'Left' : 'Right'} Stick
      </div>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => {
            onSelect(opt.id);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left cursor-pointer transition-all duration-150 border-none bg-transparent hover:bg-[#D9D9D9]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span 
            className="w-7 h-7 rounded-md flex items-center justify-center text-base"
            style={{ 
              background: `${accentColor}15`,
              color: accentColor
            }}
          >
            {opt.icon}
          </span>
          <span className="text-[#333333] font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// Main controller diagram component
export default function ControllerDiagram({ selectedInput, onSelect, accentColor = '#5180C1' }) {
  const [activeStick, setActiveStick] = useState(null); // 'left' or 'right'
  const [hoveredInput, setHoveredInput] = useState(null);

  const isSelected = (inputId) => selectedInput === inputId;
  const isHovered = (inputId) => hoveredInput === inputId;

  // Get style for a button based on state
  const getButtonStyle = (inputId, baseColor = '#A0A0A0') => {
    const inputInfo = CONTROLLER_INPUTS[inputId];
    if (isSelected(inputId)) {
      return {
        fill: `${accentColor}25`,
        stroke: accentColor,
        strokeWidth: 3,
        filter: 'drop-shadow(0 0 8px rgba(81, 128, 193, 0.4))',
      };
    }
    if (isHovered(inputId)) {
      return {
        fill: '#D9D9D9',
        stroke: '#707070',
        strokeWidth: 2,
      };
    }
    return {
      fill: inputInfo?.color ? `${inputInfo.color}20` : '#D9D9D9',
      stroke: inputInfo?.color || baseColor,
      strokeWidth: 1.5,
    };
  };

  // Handle stick click - show submenu
  const handleStickClick = (side, e) => {
    e.stopPropagation();
    setActiveStick(activeStick === side ? null : side);
  };

  // Close submenu when clicking elsewhere
  const handleBackgroundClick = () => {
    setActiveStick(null);
  };

  return (
    <div className="relative flex items-center justify-center" onClick={handleBackgroundClick}>
      <svg 
        width="640" 
        height="420" 
        viewBox="0 0 580 380" 
        className="select-none"
      >
        {/* Controller body */}
        <path
          d="M145 80 
             Q145 50, 175 50 
             L405 50 
             Q435 50, 435 80
             L435 120
             Q480 130, 510 180
             Q540 230, 520 290
             Q500 350, 450 340
             Q420 335, 400 280
             L400 200
             L180 200
             L180 280
             Q160 335, 130 340
             Q80 350, 60 290
             Q40 230, 70 180
             Q100 130, 145 120
             Z"
          fill="#CCCCCC"
          stroke="#A0A0A0"
          strokeWidth="2"
        />

        {/* Inner detail lines */}
        <path
          d="M160 85 Q160 65, 180 65 L400 65 Q420 65, 420 85"
          fill="none"
          stroke="#B8B8B8"
          strokeWidth="1.5"
        />

        {/* Left Trigger (LT) */}
        <g 
          className="cursor-pointer transition-all duration-150"
          onClick={() => onSelect('xb_left_trigger')}
          onMouseEnter={() => setHoveredInput('xb_left_trigger')}
          onMouseLeave={() => setHoveredInput(null)}
        >
          <rect
            x="150" y="30" width="70" height="25" rx="6"
            {...getButtonStyle('xb_left_trigger')}
          />
          <text x="185" y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill={isSelected('xb_left_trigger') ? accentColor : '#555555'} style={{ fontFamily: 'IBM Plex Mono' }}>
            LT
          </text>
          {/* Analog indicator */}
          <circle cx="205" cy="37" r="3" fill="#6B9BD1" />
        </g>

        {/* Right Trigger (RT) */}
        <g 
          className="cursor-pointer transition-all duration-150"
          onClick={() => onSelect('xb_right_trigger')}
          onMouseEnter={() => setHoveredInput('xb_right_trigger')}
          onMouseLeave={() => setHoveredInput(null)}
        >
          <rect
            x="360" y="30" width="70" height="25" rx="6"
            {...getButtonStyle('xb_right_trigger')}
          />
          <text x="395" y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill={isSelected('xb_right_trigger') ? accentColor : '#555555'} style={{ fontFamily: 'IBM Plex Mono' }}>
            RT
          </text>
          <circle cx="415" cy="37" r="3" fill="#6B9BD1" />
        </g>

        {/* Left Bumper (LB) */}
        <g 
          className="cursor-pointer transition-all duration-150"
          onClick={() => onSelect('xb_left_bumper')}
          onMouseEnter={() => setHoveredInput('xb_left_bumper')}
          onMouseLeave={() => setHoveredInput(null)}
        >
          <rect
            x="155" y="58" width="60" height="20" rx="4"
            {...getButtonStyle('xb_left_bumper')}
          />
          <text x="185" y="73" textAnchor="middle" fontSize="11" fontWeight="600" fill={isSelected('xb_left_bumper') ? accentColor : '#555555'} style={{ fontFamily: 'IBM Plex Mono' }}>
            LB
          </text>
        </g>

        {/* Right Bumper (RB) */}
        <g 
          className="cursor-pointer transition-all duration-150"
          onClick={() => onSelect('xb_right_bumper')}
          onMouseEnter={() => setHoveredInput('xb_right_bumper')}
          onMouseLeave={() => setHoveredInput(null)}
        >
          <rect
            x="365" y="58" width="60" height="20" rx="4"
            {...getButtonStyle('xb_right_bumper')}
          />
          <text x="395" y="73" textAnchor="middle" fontSize="11" fontWeight="600" fill={isSelected('xb_right_bumper') ? accentColor : '#555555'} style={{ fontFamily: 'IBM Plex Mono' }}>
            RB
          </text>
        </g>

        {/* Left Stick */}
        <g className="relative">
          <circle
            cx="200" cy="140"
            r="38"
            fill="#D9D9D9"
            stroke="#A0A0A0"
            strokeWidth="2"
          />
          <circle
            cx="200" cy="140"
            r="28"
            className="cursor-pointer transition-all duration-150"
            onClick={(e) => handleStickClick('left', e)}
            onMouseEnter={() => setHoveredInput('left_stick')}
            onMouseLeave={() => setHoveredInput(null)}
            fill={activeStick === 'left' || ['xb_left_stick_x', 'xb_left_stick_y', 'xb_left_stick_button'].includes(selectedInput) ? `${accentColor}25` : '#CCCCCC'}
            stroke={activeStick === 'left' || ['xb_left_stick_x', 'xb_left_stick_y', 'xb_left_stick_button'].includes(selectedInput) ? accentColor : '#707070'}
            strokeWidth={activeStick === 'left' ? 3 : 2}
          />
          <text x="200" y="145" textAnchor="middle" fontSize="11" fontWeight="600" fill="#555555" style={{ fontFamily: 'IBM Plex Mono', pointerEvents: 'none' }}>
            L
          </text>
          {/* Analog indicator */}
          <circle cx="218" cy="122" r="4" fill="#6B9BD1" style={{ pointerEvents: 'none' }} />
        </g>

        {/* Right Stick */}
        <g className="relative">
          <circle
            cx="340" cy="200"
            r="38"
            fill="#D9D9D9"
            stroke="#A0A0A0"
            strokeWidth="2"
          />
          <circle
            cx="340" cy="200"
            r="28"
            className="cursor-pointer transition-all duration-150"
            onClick={(e) => handleStickClick('right', e)}
            onMouseEnter={() => setHoveredInput('right_stick')}
            onMouseLeave={() => setHoveredInput(null)}
            fill={activeStick === 'right' || ['xb_right_stick_x', 'xb_right_stick_y', 'xb_right_stick_button'].includes(selectedInput) ? `${accentColor}25` : '#CCCCCC'}
            stroke={activeStick === 'right' || ['xb_right_stick_x', 'xb_right_stick_y', 'xb_right_stick_button'].includes(selectedInput) ? accentColor : '#707070'}
            strokeWidth={activeStick === 'right' ? 3 : 2}
          />
          <text x="340" y="205" textAnchor="middle" fontSize="11" fontWeight="600" fill="#555555" style={{ fontFamily: 'IBM Plex Mono', pointerEvents: 'none' }}>
            R
          </text>
          <circle cx="358" cy="182" r="4" fill="#6B9BD1" style={{ pointerEvents: 'none' }} />
        </g>

        {/* D-Pad */}
        <g>
          {/* D-Pad background */}
          <rect x="225" y="175" width="30" height="70" rx="4" fill="#D9D9D9" stroke="#A0A0A0" strokeWidth="1" />
          <rect x="210" y="195" width="60" height="30" rx="4" fill="#D9D9D9" stroke="#A0A0A0" strokeWidth="1" />
          
          {/* Up */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_dpad_up')}
            onMouseEnter={() => setHoveredInput('xb_dpad_up')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <rect x="228" y="178" width="24" height="20" rx="3" {...getButtonStyle('xb_dpad_up', '#707070')} />
            <text x="240" y="193" textAnchor="middle" fontSize="14" fill={isSelected('xb_dpad_up') ? accentColor : '#555555'}>↑</text>
          </g>
          
          {/* Down */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_dpad_down')}
            onMouseEnter={() => setHoveredInput('xb_dpad_down')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <rect x="228" y="222" width="24" height="20" rx="3" {...getButtonStyle('xb_dpad_down', '#707070')} />
            <text x="240" y="237" textAnchor="middle" fontSize="14" fill={isSelected('xb_dpad_down') ? accentColor : '#555555'}>↓</text>
          </g>
          
          {/* Left */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_dpad_left')}
            onMouseEnter={() => setHoveredInput('xb_dpad_left')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <rect x="213" y="198" width="20" height="24" rx="3" {...getButtonStyle('xb_dpad_left', '#707070')} />
            <text x="223" y="215" textAnchor="middle" fontSize="14" fill={isSelected('xb_dpad_left') ? accentColor : '#555555'}>←</text>
          </g>
          
          {/* Right */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_dpad_right')}
            onMouseEnter={() => setHoveredInput('xb_dpad_right')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <rect x="247" y="198" width="20" height="24" rx="3" {...getButtonStyle('xb_dpad_right', '#707070')} />
            <text x="257" y="215" textAnchor="middle" fontSize="14" fill={isSelected('xb_dpad_right') ? accentColor : '#555555'}>→</text>
          </g>
        </g>

        {/* Face Buttons */}
        <g>
          {/* Y - Top */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_button_y')}
            onMouseEnter={() => setHoveredInput('xb_button_y')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <circle cx="430" cy="105" r="18" {...getButtonStyle('xb_button_y', '#F59E0B')} />
            <text x="430" y="111" textAnchor="middle" fontSize="14" fontWeight="700" fill={isSelected('xb_button_y') ? accentColor : '#F59E0B'}>Y</text>
          </g>
          
          {/* B - Right */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_button_b')}
            onMouseEnter={() => setHoveredInput('xb_button_b')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <circle cx="460" cy="135" r="18" {...getButtonStyle('xb_button_b', '#EF4444')} />
            <text x="460" y="141" textAnchor="middle" fontSize="14" fontWeight="700" fill={isSelected('xb_button_b') ? accentColor : '#EF4444'}>B</text>
          </g>
          
          {/* A - Bottom */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_button_a')}
            onMouseEnter={() => setHoveredInput('xb_button_a')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <circle cx="430" cy="165" r="18" {...getButtonStyle('xb_button_a', '#10B981')} />
            <text x="430" y="171" textAnchor="middle" fontSize="14" fontWeight="700" fill={isSelected('xb_button_a') ? accentColor : '#10B981'}>A</text>
          </g>
          
          {/* X - Left */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_button_x')}
            onMouseEnter={() => setHoveredInput('xb_button_x')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <circle cx="400" cy="135" r="18" {...getButtonStyle('xb_button_x', '#3B82F6')} />
            <text x="400" y="141" textAnchor="middle" fontSize="14" fontWeight="700" fill={isSelected('xb_button_x') ? accentColor : '#3B82F6'}>X</text>
          </g>
        </g>

        {/* Menu Buttons */}
        <g>
          {/* View (Back) */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_view')}
            onMouseEnter={() => setHoveredInput('xb_view')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <rect x="255" y="115" width="30" height="18" rx="4" {...getButtonStyle('xb_view')} />
            <text x="270" y="128" textAnchor="middle" fontSize="8" fontWeight="600" fill={isSelected('xb_view') ? accentColor : '#555555'} style={{ fontFamily: 'IBM Plex Mono' }}>VIEW</text>
          </g>
          
          {/* Home */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_home')}
            onMouseEnter={() => setHoveredInput('xb_home')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <circle cx="290" cy="95" r="12" {...getButtonStyle('xb_home')} />
          </g>
          
          {/* Menu (Start) */}
          <g 
            className="cursor-pointer"
            onClick={() => onSelect('xb_menu')}
            onMouseEnter={() => setHoveredInput('xb_menu')}
            onMouseLeave={() => setHoveredInput(null)}
          >
            <rect x="295" y="115" width="30" height="18" rx="4" {...getButtonStyle('xb_menu')} />
            <text x="310" y="128" textAnchor="middle" fontSize="8" fontWeight="600" fill={isSelected('xb_menu') ? accentColor : '#555555'} style={{ fontFamily: 'IBM Plex Mono' }}>MENU</text>
          </g>
        </g>
      </svg>

      {/* Stick Submenus - positioned via React portal-like absolute positioning */}
      {activeStick === 'left' && (
        <div className="absolute" style={{ left: '245px', top: '135px' }}>
          <StickSubmenu
            side="left"
            onSelect={onSelect}
            onClose={() => setActiveStick(null)}
            accentColor={accentColor}
          />
        </div>
      )}
      
      {activeStick === 'right' && (
        <div className="absolute" style={{ right: '235px', top: '200px' }}>
          <StickSubmenu
            side="right"
            onSelect={onSelect}
            onClose={() => setActiveStick(null)}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Legend */}
      <div 
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-6 text-sm text-[#707070]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#6B9BD1]" />
          Analog input
        </span>
        <span>Click a button or stick to select</span>
      </div>
    </div>
  );
}
