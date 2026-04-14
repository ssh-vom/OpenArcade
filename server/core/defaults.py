from core.descriptor import (
    ControlDescriptor,
    ControlType,
    DeviceDescriptor,
    ReportFormat,
)


def _button(control_id: int, bit_index: int, label: str) -> ControlDescriptor:
    return ControlDescriptor(
        control_id,
        ControlType.BUTTON,
        ReportFormat.BITFIELD,
        bit_index=bit_index,
        bit_width=1,
        label=label,
    )


def default_descriptor() -> DeviceDescriptor:
    controls = [
        _button(1, 0, "Button 1"),
        _button(2, 1, "Button 2"),
        _button(3, 2, "Button 3"),
        _button(4, 3, "Button 4"),
        _button(5, 4, "Button 5"),
        _button(6, 5, "Button 6"),
        _button(7, 6, "Button 7"),
        _button(8, 7, "Button 8"),
        _button(18, 8, "Joystick Left"),
        _button(19, 9, "Joystick Right"),
        _button(16, 10, "Joystick Up"),
        _button(17, 11, "Joystick Down"),
        _button(20, 12, "Small Button 1"),
        _button(14, 13, "Start"),
        _button(15, 14, "Pair"),
        _button(21, 15, "Small Button 2"),
        _button(22, 16, "Small Button 3"),
        _button(23, 17, "Small Button 4"),
    ]

    return DeviceDescriptor(
        protocol_version=1,
        report_format=ReportFormat.BITFIELD,
        report_bytes=4,
        control_count=len(controls),
        controls=controls,
    )
