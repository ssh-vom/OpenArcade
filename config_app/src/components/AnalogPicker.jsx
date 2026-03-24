/**
 * AnalogPicker - Visual selector for analog axis inputs
 * 
 * Shows stick and trigger visualizations for selecting analog inputs.
 */

const ANALOG_INPUTS = {
  left_stick_x: { label: 'Left Stick X', group: 'left_stick', axis: 'x', type: 'bidirectional' },
  left_stick_y: { label: 'Left Stick Y', group: 'left_stick', axis: 'y', type: 'bidirectional' },
  right_stick_x: { label: 'Right Stick X', group: 'right_stick', axis: 'x', type: 'bidirectional' },
  right_stick_y: { label: 'Right Stick Y', group: 'right_stick', axis: 'y', type: 'bidirectional' },
  left_trigger: { label: 'Left Trigger', group: 'trigger', axis: 'single', type: 'unidirectional' },
  right_trigger: { label: 'Right Trigger', group: 'trigger', axis: 'single', type: 'unidirectional' },
};

function StickVisual({ side, selectedAxis, onSelectX, onSelectY, accentColor }) {
  const isLeft = side === 'left';
  const xId = `${side}_stick_x`;
  const yId = `${side}_stick_y`;
  const isXSelected = selectedAxis === xId;
  const isYSelected = selectedAxis === yId;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Label */}
      <div 
        className="text-base font-semibold text-[#333333]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {isLeft ? 'Left' : 'Right'} Stick
      </div>

      {/* Stick visualization */}
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 160 160">
          {/* Outer ring */}
          <circle
            cx="80" cy="80" r="70"
            fill="#CCCCCC"
            stroke="#A0A0A0"
            strokeWidth="2"
          />
          
          {/* Inner area */}
          <circle
            cx="80" cy="80" r="55"
            fill="#D9D9D9"
            stroke="#A0A0A0"
            strokeWidth="1"
          />

          {/* X-axis line (horizontal) */}
          <g 
            className="cursor-pointer"
            onClick={onSelectX}
          >
            <line
              x1="25" y1="80" x2="135" y2="80"
              stroke={isXSelected ? accentColor : '#A0A0A0'}
              strokeWidth={isXSelected ? 4 : 2}
              strokeLinecap="round"
            />
            {/* X arrows */}
            <polygon
              points="20,80 35,72 35,88"
              fill={isXSelected ? accentColor : '#707070'}
            />
            <polygon
              points="140,80 125,72 125,88"
              fill={isXSelected ? accentColor : '#707070'}
            />
            {/* Hit area */}
            <rect x="20" y="65" width="120" height="30" fill="transparent" />
          </g>

          {/* Y-axis line (vertical) */}
          <g 
            className="cursor-pointer"
            onClick={onSelectY}
          >
            <line
              x1="80" y1="25" x2="80" y2="135"
              stroke={isYSelected ? accentColor : '#A0A0A0'}
              strokeWidth={isYSelected ? 4 : 2}
              strokeLinecap="round"
            />
            {/* Y arrows */}
            <polygon
              points="80,20 72,35 88,35"
              fill={isYSelected ? accentColor : '#707070'}
            />
            <polygon
              points="80,140 72,125 88,125"
              fill={isYSelected ? accentColor : '#707070'}
            />
            {/* Hit area */}
            <rect x="65" y="20" width="30" height="120" fill="transparent" />
          </g>

          {/* Center dot */}
          <circle
            cx="80" cy="80" r="12"
            fill="#D9D9D9"
            stroke="#A0A0A0"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Axis buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSelectX}
          className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150 border-2`}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            background: isXSelected ? `${accentColor}15` : '#D9D9D9',
            borderColor: isXSelected ? accentColor : '#A0A0A0',
            color: isXSelected ? accentColor : '#555555',
          }}
        >
          X Axis ↔
        </button>
        <button
          onClick={onSelectY}
          className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-150 border-2`}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            background: isYSelected ? `${accentColor}15` : '#D9D9D9',
            borderColor: isYSelected ? accentColor : '#A0A0A0',
            color: isYSelected ? accentColor : '#555555',
          }}
        >
          Y Axis ↕
        </button>
      </div>
    </div>
  );
}

function TriggerVisual({ side, isSelected, onSelect, accentColor }) {
  const isLeft = side === 'left';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Label */}
      <div 
        className="text-sm font-semibold text-[#333333]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {isLeft ? 'Left' : 'Right'} Trigger
      </div>

      {/* Trigger visualization */}
      <button
        onClick={onSelect}
        className="cursor-pointer transition-all duration-150 border-none bg-transparent p-0"
      >
        <svg width="100" height="120" viewBox="0 0 100 120">
          {/* Trigger shape */}
          <path
            d="M20 10 
               Q20 0, 35 0 
               L65 0 
               Q80 0, 80 10
               L80 90
               Q80 110, 50 115
               Q20 110, 20 90
               Z"
            fill={isSelected ? `${accentColor}15` : '#CCCCCC'}
            stroke={isSelected ? accentColor : '#A0A0A0'}
            strokeWidth={isSelected ? 3 : 2}
          />
          
          {/* Direction arrow */}
          <path
            d="M50 30 L50 80 M40 70 L50 85 L60 70"
            fill="none"
            stroke={isSelected ? accentColor : '#707070'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Label */}
          <text
            x="50" y="108"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={isSelected ? accentColor : '#555555'}
            style={{ fontFamily: 'IBM Plex Mono' }}
          >
            {isLeft ? 'LT' : 'RT'}
          </text>
        </svg>
      </button>

      {/* Type indicator */}
      <div 
        className="text-xs text-[#707070]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Unidirectional
      </div>
    </div>
  );
}

export default function AnalogPicker({ selectedInput, onSelect, accentColor = '#6B9BD1' }) {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* Sticks Row */}
      <div className="flex gap-16">
        <StickVisual
          side="left"
          selectedAxis={selectedInput}
          onSelectX={() => onSelect('left_stick_x')}
          onSelectY={() => onSelect('left_stick_y')}
          accentColor={accentColor}
        />
        <StickVisual
          side="right"
          selectedAxis={selectedInput}
          onSelectX={() => onSelect('right_stick_x')}
          onSelectY={() => onSelect('right_stick_y')}
          accentColor={accentColor}
        />
      </div>

      {/* Divider */}
      <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-[#A0A0A0] to-transparent" />

      {/* Triggers Row */}
      <div className="flex gap-16">
        <TriggerVisual
          side="left"
          isSelected={selectedInput === 'left_trigger'}
          onSelect={() => onSelect('left_trigger')}
          accentColor={accentColor}
        />
        <TriggerVisual
          side="right"
          isSelected={selectedInput === 'right_trigger'}
          onSelect={() => onSelect('right_trigger')}
          accentColor={accentColor}
        />
      </div>

      {/* Legend */}
      <div 
        className="text-xs text-[#707070] text-center mt-4"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Click an axis or trigger to select
      </div>
    </div>
  );
}
