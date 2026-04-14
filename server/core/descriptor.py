from dataclasses import dataclass, field
from enum import IntEnum


class ControlType(IntEnum):
    BUTTON = 1
    AXIS = 2
    HAT = 3


class ReportFormat(IntEnum):
    BITFIELD = 0
    PACKED = 1
    AXIS = 2


@dataclass
class ControlDescriptor:
    control_id: int
    control_type: ControlType
    fmt: ReportFormat
    flags: int = 0
    bit_index: int | None = None
    bit_width: int | None = None
    byte_offset: int | None = None
    bit_offset: int | None = None
    label: str | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.control_id,
            "type": int(self.control_type),
            "format": int(self.fmt),
            "flags": self.flags,
            "bit_index": self.bit_index,
            "bit_width": self.bit_width,
            "byte_offset": self.byte_offset,
            "bit_offset": self.bit_offset,
            "label": self.label,
        }


@dataclass
class DeviceDescriptor:
    protocol_version: int = 1
    report_format: ReportFormat = ReportFormat.BITFIELD
    report_bytes: int = 4
    control_count: int = 0
    unique_id: int | None = None
    fw_ver: int | None = None
    controls: list[ControlDescriptor] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        return {
            "protocol_version": self.protocol_version,
            "report_format": int(self.report_format),
            "report_bytes": self.report_bytes,
            "control_count": self.control_count or len(self.controls),
            "unique_id": self.unique_id,
            "fw_ver": self.fw_ver,
            "controls": [control.to_dict() for control in self.controls],
        }


TLV_PROTO_VER = 0x01
TLV_REPORT_FORMAT = 0x02
TLV_REPORT_BYTES = 0x03
TLV_CONTROL_COUNT = 0x04
TLV_UNIQUE_ID = 0x05
TLV_FW_VER = 0x06
TLV_CONTROL_DESC = 0x10
TLV_CONTROL_LABEL = 0x11


def _parse_control_desc(value: bytes) -> ControlDescriptor | None:
    if len(value) < 7:
        return None

    control_id, control_type, flags, fmt, p1, p2, p3 = value[:7]

    try:
        control_type_enum = ControlType(control_type)
        fmt_enum = ReportFormat(fmt)
    except ValueError:
        return None

    ctrl = ControlDescriptor(
        control_id=control_id,
        control_type=control_type_enum,
        fmt=fmt_enum,
        flags=flags,
    )

    if fmt_enum == ReportFormat.BITFIELD:
        ctrl.bit_index = p1
        ctrl.bit_width = p2
    else:
        ctrl.byte_offset = p1
        ctrl.bit_offset = p2
        ctrl.bit_width = p3

    return ctrl


def parse_info_tlv(payload: bytes) -> DeviceDescriptor | None:
    if not payload:
        return None

    descriptor = DeviceDescriptor()
    labels: dict[int, str] = {}
    controls: list[ControlDescriptor] = []

    index = 0
    while index + 2 <= len(payload):
        tlv_type = payload[index]
        tlv_len = payload[index + 1]
        index += 2

        if index + tlv_len > len(payload):
            break

        value = payload[index : index + tlv_len]
        index += tlv_len

        if tlv_type == TLV_PROTO_VER and tlv_len >= 1:
            descriptor.protocol_version = value[0]
        elif tlv_type == TLV_REPORT_FORMAT and tlv_len >= 1:
            try:
                descriptor.report_format = ReportFormat(value[0])
            except ValueError:
                pass
        elif tlv_type == TLV_REPORT_BYTES and tlv_len >= 2:
            descriptor.report_bytes = int.from_bytes(value[:2], "little")
        elif tlv_type == TLV_CONTROL_COUNT and tlv_len >= 1:
            descriptor.control_count = value[0]
        elif tlv_type == TLV_UNIQUE_ID and tlv_len >= 4:
            descriptor.unique_id = int.from_bytes(value[:4], "little")
        elif tlv_type == TLV_FW_VER and tlv_len >= 2:
            descriptor.fw_ver = int.from_bytes(value[:2], "little")
        elif tlv_type == TLV_CONTROL_DESC:
            control = _parse_control_desc(value)
            if control:
                controls.append(control)
        elif tlv_type == TLV_CONTROL_LABEL and tlv_len >= 2:
            control_id = value[0]
            label = value[1:].decode("ascii", errors="ignore").strip()
            if label:
                labels[control_id] = label

    for control in controls:
        if control.control_id in labels:
            control.label = labels[control.control_id]

    descriptor.controls = controls
    if descriptor.control_count == 0:
        descriptor.control_count = len(controls)

    return descriptor
