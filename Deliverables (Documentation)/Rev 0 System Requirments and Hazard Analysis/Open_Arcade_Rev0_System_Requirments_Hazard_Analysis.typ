#set page("us-letter")
#set text(size: 10pt, font: "New Computer Modern")
#set heading(numbering: "1.1  ")

#show figure.where(kind: table): set figure.caption(position: top)

#grid(columns: (1fr, 1fr), gutter: -8cm, align(left)[
  #text(
    size: 12pt, fill: rgb("#7a003d"), weight: "semibold",
  )[OpenArcade | Group 3]
  #v(-2.5mm)
  Anish Paramsothy, paramsa\
  Chris Palermo, palerc1\
  Mitchel Cox, coxm12\
  Shivom Sharma, shars119\
  Jacqueline Leung, leungw18
], align(right)[
  #image("m24-col_png.png", width: 40%)
])

#align(
  center, [
    #v(6cm)
    #text(size: 30pt, weight: "bold")[Rev 0:]\
    #text(size: 30pt, weight: "bold")[System Requirements and Hazard Analysis]\
    #v(2mm)
    #text(size: 12pt)[MECHTRON 4TB6, McMaster University]
  ],
)

#v(7cm)

#align(left, [
  *Date Submitted:* November 16, 2025\
  *Due Date:* November 18, 2025
])

#pagebreak()

#set page(numbering: "   1   ")

#set page(
  header-ascent: 5.5mm, header: [
    #align(
      top, grid(
        columns: (1fr, 1fr, 1fr), inset: (top: 16.5mm), align(left)[OPENARCADE], align(center)[Rev 0], align(right)[MECHTRON 4TB6],
      ),
    )

    #rect(width: 100%, height: 0.15mm, fill: black)
  ],
)

#text(size: 18pt, weight: "bold")[Contents]\
#show outline.entry.where(level: 1): it => {
  set text(weight: "light")
  it
}
#show outline.entry.where(level: 2): it => {
  set text(fill: luma(80))
  it
}
#show outline.entry.where(level: 3): it => {
  set text(fill: luma(130))
  it
}
#outline(title: [], indent: 6.5mm)

#pagebreak()

#set par(justify: true)
= Glossary
#v(3mm)
#list(
  [#text(fill: rgb("#7a003d"))[*Module:* ]a unit that contains electronics
    (microcontroller and wiring), that will communicate inputs to another device.], [#text(fill: rgb("#7a003d"))[*Parent Module:* ]describes the central hub that
    children modules will communicate to. This parent module will connect to a
    computer/console to communicate to the game.], [#text(fill: rgb("#7a003d"))[*Child Module:* ]describes a unit that may contain
    joysticks, buttons, d-pads, etc. These will communicate the inputs to the parent
    module and then to the game. ], [#text(fill: rgb("#7a003d"))[*HID:* ] Human-interface device. A device that
    allows the [user #sym.arrow computer] connection to occur.], [#text(fill: rgb("#7a003d"))[*KeepAlive (KA):* ] a 1-bit signal that is sent
    between devices to check that the connection is operating correctly.],
)
= Introduction
== Project Description
#v(3mm)
Design and development of an arcade/box style controller series of children
modules that can be mechanically connected to each other allowing gamers to
develop their own combination and style of controller. Along with the idea that
gamers can combine children modules together in configurations and orientations,
we want to give them the option to play using the children modules separately.
The children modules will be connected to a parent module via bluetooth to
communicate the inputs of the children modules to the game.\
== Scope
#v(3mm)
For revision 0, the OpenArcade team has listed a few critical points to define
the milestone. These points will be used to assess the successful completion of
the initial revision. _These points are subject to change._
#list(
  [2 child modules (joystick and buttons), that will communicate to the the
    singular parent module via bluetooth. These modules will be encased in a simple
    housing that will not include the mechanical attachment feature.], [A preliminary configuration app to allow buttons to be programmed to perform
    specific functions by default.],
)
== Purpose
#v(3mm)
The purpose of this document is to outline the system requirements for the
OpenArcade controller initial design demonstration (revision 0), which considers
the software, hardware, safety and timing aspects of the design. The document
will also showcase the hazards related to the entire scope of the project
(including development and post-commercialization).\ Any future modifications to
the system requirements or hazard analysis will result in updated documentation
by the OpenArcade team and will require consultation with the MECHTRON 4TB6
staff, along with sufficient justification as to why the changes are necessary.

#pagebreak()

#set page(
  header-ascent: 5.5mm, header: [
    #align(
      top, grid(
        columns: (1fr, 1fr, 1fr), inset: (top: 16.5mm), align(left)[OPENARCADE], align(center)[Rev 0 System Overview], align(right)[MECHTRON 4TB6],
      ),
    )

    #rect(width: 100%, height: 0.15mm, fill: black)
  ],
)
= System Overview
#v(3mm)
The system overview discusses the underlying processes that occur for the
OpenArcade controller to function correctly, while also outlining the important
variables that are to be included during the development of the project.==
Systems Diagram
#v(3mm)
@fig:fig1 below showcases the systems diagram that roughly explains how the
OpenArcade system functions, while @fig:fig2 describes the [User #sym.arrow Game]
pipeline to give meaning to both the systems diagram and process that the
OpenArcade team plans to implement (_please note that the variables are to be
defined in the next section_):
#figure(image("sys_dgm.jpg"), caption: [Systems diagram])<fig:fig1>

#v(5mm)

#figure(image("con_dgm.jpg", width: 100%), caption: [Context diagram])<fig:fig2>

== Desired Behaviour
#v(3mm)
The OpenArcade controller will be able to provide an ergonomic substitute to the
several game controllers that are currently on the market. The controller will
connect individual child modules to the parent module to allow the user to form
any controller variation that they may want. The controller will be able to last
for several hours of continuous play time before requiring charging or battery
replacements. The controller will strive to achieve similar performance
requirements as other commercial controllers, such as having regular input delay
and having access to a typical set of buttons to functionally play a game.

#pagebreak()

== Monitored Variables
#v(3mm)
#set table(stroke: (x, y) => if y > 0 { (bottom: 0.35pt) }, fill: (x, y) =>
if y == 0 { rgb("#7a003d") }, inset: (right: 0.75em), align: left)
Table 1: Monitored variables
#v(-3mm)
#align(
  center, [
  #table(
    columns: (32%, 48%, 20%), [#text(fill: white)[*Monitored Variable*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Units*]], [`button_st`], [Assigned to the current state of any button on the child module. Upon key press,
      the button state notifies that it is on.], [True/False], [`jval_x`], [Assigned to the current orientation of a joystick on the child module. The
      output ADC value for x position.], [Unitless], [`jval_y`], [Assigned to the current orientation of a joystick on the child module. The
      output ADC value for y position.], [Unitless], [`inp_del`], [Will be used to monitor the time elapsed of a user event translating to an event
      on the device.], [ms], [`con_st`], [The status of the child modules, and if they are paired to the parent module.], [True/False], [`con_t`], [The time it takes for child module to connect to parent module.], [ms], [`pair_st`], [The value that expresses the pairing feature for BLE is on or off.], [True/False], [`err_rep`], [The error report detailing issues associated with child or parent modules], [Unitless], [`gpio_spd`], [The time between button press and the interrupt registering on child module
      (ESP32 board).], [Unitless], [`num_mods`], [The number of child modules connected in the system.], [Unitless], [`temp`], [The current average temperature of the controller.], [°C], [`T_hb`], [Bit value to represent KA signal.], [unitless],
  )
  ],
)
== Controlled Variables
#v(3mm)
Table 2: Controlled variables
#v(-3mm)
#align(
  center, [
  #table(
    columns: (33%, 47%, 20%), [#text(fill: white)[*Controlled Variables*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Units*]], [`HID_Report`], [The report detailing the state of button presses and joystick orientation, and
      the encoding of those entries in the the format of a standardized gamepad.], [Unitless], [`device_list`], [A list of current child modules connected to parent.], [Unitless], [`dz_x`], [The positional range of values (in the x direction), where a user movement of
      the joystick within this range will not register as an input (deadzone).], [[5-15]% of joystick ADC range], [`dz_y`], [The positional range of values (in the y direction), where a user movement of
      the joystick within this range will not register as an input (deadzone).], [[5-15]% of joystick ADC range],
  )
  ],
)
== Constant Variables
#v(3mm)
Table 3: Constant variables
#v(-3mm)
#align(
  center, [
  #table(
    columns: (32%, 47%, 21%), [#text(fill: white)[*Constant Variables*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Units*]], [`jval_x_range`], [The range of the x axis of the joystick.], [$[-127,127]$], [`jval_y_range`], [The range of the y axis of the joystick.], [$[-127,127]$], [`UUID`], [The unique identifier for each child module/ESP32 board.], [Unitless], [`MAC ID`], [The unique physical address for each child module/ESP32 board.], [Unitless], [`con_to`], [A time interval that declares connection timeout if there is no communication
      within that interval (connection timeout).], [ms], [`poll_rt`], [The frequency/rate at which the HID polling occurs.], [Hz], [`Device_Descriptor`], [The set of fields that define what the parent module is. This includes
      characteristics such as: vendor ID, product ID, device class/subclass/protocol,
      form of communication required (HID), etc.], [Unitless], [`temp_warn`], [The first threshold temperature of the system that will notify the user if `temp > temp_warm`], [°C], [`temp_critical`], [The second threshold for temperature of the system resulting in system shutdown
    if `temp > temp_critical`], [°C],
  )
  ],
)

#pagebreak()
== Functional Decomposition
#v(3mm)
@fig:fig3 displays the structure of the OpenArcade controller in simple terms,
showcasing the several aspects of the design that communicate with each other to
form the full controller. The diagram displays how the system splits into two
main components: the child and parent module, where the parent module performs
the function of reading inputs from the child module and packaging and
transmitting the HID report to the device in order for a game to be played.
#figure(
  image("fnc_decomp.jpg", width: 100%), caption: [Functional decomposition diagram],
)<fig:fig3>

#pagebreak()

#set page(
  header-ascent: 5.5mm, header: [
    #align(
      top, grid(
        columns: (1fr, 1fr, 1fr), inset: (top: 16.5mm), align(left)[OPENARCADE], align(center)[Rev 0 Hazard Analysis], align(right)[MECHTRON 4TB6],
      ),
    )

    #rect(width: 100%, height: 0.15mm, fill: black)
  ],
)

= Hazard Analysis
#v(3mm)
The hazard analysis is organized into three categories: injury (during use),
input registration errors (pressing buttons resulting in nothing happens), and
case failure. In order to combat these hazards, there are mitigation methods the
OpenArcade team plans to integrate in the design.== Critical Assumptions Given
the scope of the hazard analysis, the following assumptions were made to
constrain the environment:
#list(
  [User will use the device similar to any controller (accidents can/will happen).], [Device(s) will be used on a surface (table/lap).], [User will not intentionally modify/disassemble the device beyond its intended
    purpose.], [Operating environment will be indoors under normal temperature humidity
    conditions.],
)
== Fault Tree Analysis
#v(3mm)
A fault tree analysis was performed to map all potential hazards that can occur
on all aspects of the project (during manufacturing and post-commercialization).
@fig:ha1, @fig:ha2 and @fig:ha3 showcase the table in a visual format, so that
the connections between hazards can be identified more clearly.
#v(1mm)
Table 4: Hazard analysis
#v(-3mm)
#align(
  center, [
    #table(
      columns: (17%, 20%, 30%, 33%), [#text(fill: white)[*Hazard label*]], [#text(fill: white)[*Hazard Mode*]], [#text(fill: white)[*Hazard\ Description*]], [#text(fill: white)[*Mitigation Strategy*]], [H101\ \ H102\ \ H103\ \ H104, H105, H106\ \ H107, H105, H106, H108, H109], [Scrapes\ \ Impalement\ \ Flying debris\ \ Pinches\ \ \ Burns], [During construction of the system, the builder may slip resulting in
        scrapes/cuts, impalement, flying debris, pinches or burns.], [During construction, wear all appropriate PPE and use the proper tools, so that
        if an accident does happen, there are measures in place to prevent an injury
        from occurring. Furthermore, ensure all body parts are out of harm's way of
        moving parts or hot parts.], [H108], [Micro particles], [During the melting of plastic, tiny micro particles can become airborne,
        inhaling these particles can cause respiratory irritation.], [Operate 3D printers in a well ventilated room.], [H110], [Shocks by electrical components], [Some electrical components may store some voltage. Due to a voltage difference
        between an individual’s skin and the component, a small shock may occur.], [Ensure all PPE is worn (eg. ESD bracelet) to reduce the chance of a shock.], [H203, H201, H202, H404, H405], [Dropped device], [During use, the device may be bumped or dropped onto a body part of the user.
        This has the potential to injure the user or others around them.], [Research strategies to reduce the chance of the device being dropped/moved
        unintentionally.], [H206, H204, H205], [Injury caused by user error], [During use, the user may over exert themselves with poor ergonomics or prolonged
        use resulting in repetitive strain injury.], [Ensure optimal wrist and hand position to ensure good ergonomics.], [H301, H307, H308], [Component failure], [During use, a component may fail, putting the device into an unusable state.], [Ensure all components are tested and reliable to support sustainable usage.], [H302, H407], [Overheat], [If the device is powered for too long without proper cooling methods, the device
        may overheat and malfunction.], [Ensure devices have adequate cooling methods to maintain a functioning system.], [H303, H310, H311], [Software error], [Within the system there are multiple layers of software that could result in a
        malfunction.], [Create tests to ensure all functions perform as intended.], [H304], [External noise interference], [If there are too many devices sending strong signals, the system signals may be
        drowned out.], [Research functionality with multiple other devices around.], [H305], [USB noise], [If there is a strong USB signal, the system BLE signal may be drowned out.], [Research functionality with BLE and USB enabled.], [H306], [Board delay], [Hardware limitations given by the Raspberry Pi Zero 2 W and ESP32 may result in
        delayed input depending on the time complexity of the software written.], [Ensure all software does not result in a noticeable delay. This will be done by
        writing tests constrained by time complexity.], [H403, H401, H402], [Excessive load], [During use one of the devices may experience excessive load, this could damage
        the outer structure of the case.], [Research methods to resist excessive load.], [H406], [Water damage], [Accidents may occur that result in liquid coming into contact with one of the
        devices.], [Ensure the user is aware of damage that may occur if liquid comes into contact
        with the device.],
    )
  ],
)

=== Case failure
#figure(image("ha_3.jpg", width: 70%), caption: [Case failure fault tree])<fig:ha1>

=== Input Registration Error
#figure(
  image("ha_2.jpg", width: 85%), caption: [Input registration error fault tree],
)<fig:ha2>

=== Injury
#figure(image("ha_1.png", width: 100%), caption: [Injury fault tree])<fig:ha3>

#pagebreak()

#set page(
  header-ascent: 5.5mm, header: [
    #align(
      top, grid(
        columns: (1fr, 1fr, 1fr), inset: (top: 16.5mm), align(left)[OPENARCADE], align(center)[Rev 0 System Requirements], align(right)[MECHTRON 4TB6],
      ),
    )
    #rect(width: 100%, height: 0.15mm, fill: black)
  ],
)
= System Requirements
The system requirements define parameters constraints and conditions that must
be met for the OpenArcade project to be considered successful. The table below
associates an identifier to each requirement type to prevent confusion.
#align(
  center, [
    Table 5: Requirement identifiers
    #v(-3mm)
    #table(
      columns: (17%, 30%), [#text(fill: white)[*Requirement\ identifier*]], [#text(fill: white)[*Types of Requirements*]], [TR], [Timing requirements], [HW], [Hardware requirements], [SW], [Software requirements], [SR], [Safety requirements],
    )
  ],
)
== Performance Timing Requirements
#v(3mm)
Table 6: Timing requirements
#v(-3mm)
#align(
  center, [
  #table(
    columns: (17%, 37%, 28%, 18%), [#text(fill: white)[*Timing\ Requirement label*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Rationale*]], [#text(fill: white)[*Associated Requirements*]], [TR-01], [Polling rate.\ Parent shall poll HID/child inputs between $[500,1000]$Hz,
      defaulting at 1000Hz.], [Fastest legal input for a HID device is 1000Hz allowing for responsive gaming.], [SW-01], [TR-02], [Connection timeout.\ Defaults at 2s, configurable in $[1,10]$s range, parent
    marks disconnected after `con_to`.], [Stops processing of corrupted packets for disconnected devices and allows for
      handling of reconnection.], [SW-07], [TR-03], [GPIO interrupt latency (`gpio_spd`). Interrupt latency (time from hardware
    interrupt to application handler execution) shall be $<=$ 1ms on child with `gpio_spd` in
    the $[40,80]$MHz range.], [Removes hardware latency from playing a role in processing buttons and
      joysticks.], [N/A],
  )
  ],
)
== Hardware Requirements
#v(3mm)
Table 7: Hardware requirements
#v(-3mm)
#align(
  center, [
    #table(
      columns: (17%, 37%, 28%, 18%), [#text(fill: white)[*Hardware\ Requirement label*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Rationale*]], [#text(fill: white)[*Associated Requirements*]], [HW-01], [Temperature Monitoring.\ Each child module shall monitor internal temperature
        and raise a warning if average internal temperature exceeds 85℃ , critical
        failure occurring at 100℃ with immediate shutdown.], [Based on the max ESP32 max temperature, which is far lower than the temp where
        PLA will melt.], [SR-2], [HW-02], [GPIO debounce.\ All GPIO shall support debouncing either in hardware or software $<=$ 10ms
        debounce time], [Ensures consistent button readings], [N/A], [HW-03], [Modular Hardware System.\ The controller shall use a modular hardware
        architecture consisting of a parent board and multiple detachable child boards,
        each containing their own microcontroller interfacing via BLE.], [Supports the accessibility goals for the controller.], [N/A], [HW-04], [Parent-board requirements.\ The parent board shall include a microcontroller
        capable of aggregating input data from all child boards and communicating with
        the host device.], [Centralized HID reports.], [N/A], [HW-05], [Module Limits.\ The main board shall support 1-4 child modules connected
        simultaneously via BLE.], [Supports intended modularity and accessibility goals for controller.], [N/A], [HW-06], [Joystick wiring.\ All joysticks shall interface through ADC lines supporting at
        least 8-bit resolution $[-127,127]$], [Matches requirements for joystick resolution in messaging packet.], [N/A], [HW-07], [LED Indication.\ The child modules shall include an LED to display their current
        status (Power, Pairing, Paired, Error)], [Required for user to know what is currently happening with the devices.], [N/A],
    )
  ],
)
== Software Requirements
#v(3mm)
Table 8: Software requirements
#v(-3mm)
#align(
  center, [
  #table(
    columns: (17%, 42%, 23%, 18%), [#text(fill: white)[*Software\ Requirement label*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Rationale*]], [#text(fill: white)[*Associated Requirements*]], [SW-01], [HID Report Frequency.\ Parent hub shall generate HID reports at a configurable
      polling rate in range of [500,1000]Hz, defaulting at 1000Hz.], [Allows for the system to remain responsive, 1000Hz is the fastest legal report.], [SR-7, H306], [SW-02], [Input to HID latency (input delay).\ Time from physical change in button state
      to HID report delivered to host. Shall fall in the range of [10,100]ms.], [Ensures responsive inputs for gaming, and matches input delays of current
      commercial controllers.], [N/A], [SW-03], [Device identification & bonding (pairing).\ Each ESP32 child shall present a
      unique Board UUID and MAC ID during pairing phase. Parent shall maintain a
      mapping table of [UUID #sym.arrow profile] persisting across reboots.], [Deterministic mapping of profiles for controls.], [N/A], [SW-04], [Packet/Messaging Integrity.\ Parent and child shall use a packet format
      containing a checksum and sequence number, rejecting invalid packets.], [Prevents Corrupted frames/messaged from being processed.], [SR-7, H303], [SW-05], [Button Sampling.\ Child modules shall sample button GPIO at $>=$ 1kHz,
      debouncing will be applied if necessary by a configurable value that shall fall
      in the range of [2,10]ms.], [Stops ghosting of values.], [SR-4], [SW-06], [Joystick ADC mapping.\ ADC values shall be converted a signed 8-bit range [-127,
      127], with configurable deadzone.], [Compact messaging and compatibility with other common controllers over HID.], [N/A], [SW-07], [Heartbeat monitoring.\ Each child shall send notifications every `T_hb` = 250ms
    (default, configurable). Parent marks devices as disconnected if no heartbeat
    received for `con_to` $[1,10]$s.], [Allows for fast detection of a disconnect and handling of reconnection if
      necessary, avoids corrupted packets from processing.], [SR-3], [SW-08], [Error reporting/alarms.\ Parent and child modules shall expose standard
      error-code enum over BLE and HID when critical errors occur, sending alert
      packets to be processed.], [Allows for sensible debugging and notification to the user if the device fails.], [SR-2, SR-3],
  )
  ],
)
== Safety Requirements
#v(3mm)
Table 9: Safety requirements
#v(-3mm)
#align(
  center, [
    #table(
      columns: (17%, 37%, 28%, 18%), [#text(fill: white)[*Hardware\ Requirement label*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Rationale*]], [#text(fill: white)[*Associated Requirements*]], [SR-01], [The device(s) shall prevent the user from accessing any non-critical
        electronics.], [The user should not be able to access wiring or components not intended for
        regular use. (This excludes the battery pack as this must be accessible to the
        user).], [H110, H302, H407], [SR-02], [The child devices shall set an alarm if the average internal temperature of the
        device is > 85°C.], [85°C is the maximum operating temperature of the ESP32 Board.], [H302, H407], [SR-03], [The device(s) shall set an alarm if user inputs are not being sent to the parent
        device when the devices are connected and input buttons are pressed.], [Alarm will signal that there is a potential signal/component failure that needs
        to be addressed.], [H301, H307, H308], [SR-04], [The child device input interface shall be reliable and function for over 100000
        cycles.], [Functioning buttons ensures no sharp edges appear from wear of certain parts of
        the child device.], [H301], [SR-05], [@RAHMAN199893 The device(s) shall be designed to withstand the forces of 3x a
        typical button press $3(~2$N).], [Our controllers should withstand the force of regular use.], [H403], [SR-06], [The device(s) shall be designed to withstand accidental dropping for up to
        500mm.], [The device should not be dropped, but in the case that is is, the device will be
        able to withstand small drops.], [H203, H201, H202, H404, H405], [SR-07], [The device(s) must verify the validity of all signals sent between the parent
        and child.], [To ensure proper communication the device(s) must verify and acknowledge the
        signal being sent to and from each device.], [H303, H310, H311],
    )
  ],
)
== Undesired Event Handling
#v(3mm)
Table 10: Undesired event handling
#v(-3mm)
#align(
  center, [
    #table(
      columns: (8%, 22%, 35%, 35%), [#text(fill: white)[*Event ID*]], [#text(fill: white)[*Event*]], [#text(fill: white)[*Response*]], [#text(fill: white)[*Rationale*]], [UE-01], [Temperature exceeds 100°C.], [Raise warning within 15°C or target, and then immediately shut down upon
        reaching threshold.], [The temperature should not exceed certain temperature thresholds to prevent
        damage to the user during using and damage to the hardware.], [UE-02], [Connection timeout during child module initial boot up.], [A pairing button will be pressed to allow the child module to re-advertise
        itself to the parent module.], [Will ensure that connectivity can occur at any moment.],
    )
  ],
)
== Modifiable Requirements
#v(3mm)
The modifiable requirements are the requirements that are likely to change
during the development of the OpenArcade controller.\

Table 11: Modifiable requirements
#v(-3mm)
#align(
  center, [
    #table(
      columns: (20%, 80%), [#text(fill: white)[*Requirement ID*]], [#text(fill: white)[*Rationale*]], [TR-02], [Connection Timeout will be adjusted during testing to find a reasonable medium.], [HW-01], [The thresholds may be changed in the case where the temperatures mentioned are
        too hot for the casing and electrical components, or if the temperatures
        mentioned are not causing any problems.], [SW-06], [The joystick ADC mapping may be changed to either increase or decrease
        resolution depending on the size that is chosen to actually store the x and y
        values.], [SR-06], [The durability of the device may change during the development of the
        controller, as it is something that is still being discussed.],
    )
  ],
)
== Fixed Requirements
#v(3mm)
The fixed requirements are the requirements that are not likely to change during
the course of the project, as they are more fundamental to the core design of
the OpenArcade controller.\

Table 12: Fixed requirements
#v(-3mm)
#align(
  center, [
    #table(
      columns: (20%, 80%), [#text(fill: white)[*Requirement ID*]], [#text(fill: white)[*Rationale*]], [TR-01], [The polling frequency will most likely not change since increasing input delay
        with decreased polling frequency can result in the controller feeling slow.], [HW-03], [The goal of the OpenArcade controller is for it to remain as a modular design,
        and removing this design feature will heavily change the scope of the project.], [HW-04], [The parent module's only goal is to act as the medium between child modules and
        device.], [HW-05], [For the scope of the capstone, this design feature is likely to stay the same.], [SW-03], [The parent module should always note all devices connected to it.], [SW-08], [Error handling should always be available between parent and child modules.], [SR-07], [Devices should always be required to verify signals sent to ensure proper
        communication occurs at all times.],
    )
  ],
)

#pagebreak()
#set heading(numbering: none)
#align(center)[
  = References
]
#v(3mm)
#bibliography(title: none, "Biblio_Sysreq_Haz.bib")
