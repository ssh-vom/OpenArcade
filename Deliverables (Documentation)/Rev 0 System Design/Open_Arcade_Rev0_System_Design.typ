#set page("us-letter")
#set text(size: 11.5pt, font: "New Computer Modern")
#set heading(numbering: "1.1  ")

#show figure.where(kind: table): set figure.caption(position: top)
#show ref: set text(fill: rgb("#64a5cf"))
#show figure: set block(breakable: true)

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
    #text(size: 30pt, weight: "bold")[Rev 0: ] 
    #text(size: 30pt, weight: "bold")[System Design]\
    #v(2mm)
    #text(size: 12pt)[MECHTRON 4TB6, McMaster University]
  ],
)

#v(9cm) 

#align(left, [
  *Date Submitted:* December 21, 2025\
  *Due Date:* December 21, 2025
])

#pagebreak()

#set page(numbering: "1")

#set page(
  header-ascent: 4.5mm, header: [
    #align(
      top, grid(
        columns: (1fr, 1fr, 1fr), inset: (top: 16.5mm), align(left)[OPENARCADE], align(center)[Rev 0: System Design], align(right)[MECHTRON 4TB6],
      ),
    )

    #rect(width: 100%, height: 0.15mm, fill: black)
  ],
)

#text(size: 18pt, weight: "bold")[Contents]
#v(-4mm)
#show outline.entry.where(level: 1): it => {
  set text(weight: "bold")
  it
}
#show outline.entry.where(level: 2): it => {
  set text(weight: "light")
  it
}
#show outline.entry.where(level: 3): it => {
  set text(fill: luma(80))
  it
}
#show outline.entry.where(level: 4): it => {
  set text(fill: luma(120))
  it
}
#outline(title: [], indent: 8mm)

#pagebreak()

#set par(justify: true)
= Glossary 
#list(
  [#text(fill: rgb("#7a003d"))[Module:]  a unit that contains electronics (microcontroller and wiring), that will communicate inputs to another device.], 
  [#text(fill: rgb("#7a003d"))[Parent Module:] describes the central hub that children modules will communicate to. This parent module will connect to a computer/console to communicate to the game.], 
  [#text(fill: rgb("#7a003d"))[Child Module:] describes a unit that may contain joysticks, buttons, d-pads, etc. These will communicate the inputs to the parent module and then to the game. ], 
  [#text(fill: rgb("#7a003d"))[HID:] Human-interface device. A device that allows the [user #sym.arrow computer] connection to occur.], 
  [#text(fill: rgb("#7a003d"))[KeepAlive (KA):] a 1-bit signal that is sent between devices to check that the connection is operating correctly.],
)
= Introduction
== Project Description

Design and development of an arcade/box style controller series of children
modules that can be mechanically connected to each other allowing gamers to
develop their own combination and style of controller. Along with the idea that
gamers can combine children modules together in configurations and orientations,
we want to give them the option to play using the children modules separately.
The children modules will be connected to a parent module via bluetooth to
communicate the inputs of the children modules to the game.\
== Scope

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

The purpose of this document is to outline the overall system design that will be used in the upcoming Rev 0, as well as set a basic framework that the OpenArcade Team plans to follow from now until the finalization of the product. The document will include: \

#list(
  [Building off of the system requirements document, with any new changes addressed for clarity.],
  [Overall system design diagrams outlining the new process flow of the entire system.],
  [Software Design and reasoning.],
  [Hardware Design and reasoning.],
  [Mechanical Design and reasoning.],
) _Note that this document may be subject to change, as during the manufacturing of the project, the team may decide to move forward with new design aspects that better optimize our idea. Any new additions or adjustments will be documented during the
 next deliverable/milestone so that the MECHTRON 4TB6 staff can acknowledge the changes and understand why it was needed._

= System Overview and Behaviour
This section will overview the design of the system in greater detail as to what was provided in the _System Requirements and Hazard Analysis_ document. As mentioned before, this section will outline the underlying processes that occur while the OpenArcade controller is in use. This will include how sub-systems connect to each other, and the corresponding inputs and outputs of each of those sub-systems.
== Systems Diagram (Updated)
Between now and the previous deliverable, the system design been modified slightly to accurately showcase what the group plans on implement in greater detail to before.
#figure(image("SystemDiagram.png"), caption: [Systems diagram])<fig:fig1>
@fig:fig1 shows the monitored/controlled inputs and outputs of each of the subsystems that are required for correct functionality of the OpenArcade controller. It can be noted that there is an increased degree of detail as to what is involved in the system. Along with the inner processes of each board being explained, the new changes include:
#list(
  [Introduced/removed new processes and variables:
  #list(
    [#text(fill:rgb("#7a003d"),"State package"): a bit array that describes the current state of the buttons and values of the joysticks, which is to be sent to the parent module.],
    [#text(fill:rgb("#7a003d"),"NOTIFICATION_ACK"): a process in which upon a successful connection between parent and child, the parent will send a signal that a data packet is being received.],
    [#text(fill:rgb("#7a003d"),"Advertising"): if a pairing button is pressed OR the child module is powered on, the child module will advertise itself for BLE connection.],
    [#text(fill:rgb("#7a003d"),"New state package mapping"): when the configuration app is used, it will remap what each bit in the state package sequence will relate to in HID mapping.],
    [#text(fill:rgb("#7a003d"),"Joystick value"): The joystick currently chosen (mentioned later in @tbl:tb7) discusses that the joystick has 4 state directional outputs, and does not utilize values of X and Y with higher resolution. _This may be subject to change for the Rev 1 deliverable_],
    [#text(fill:rgb("#7a003d"),"Deadzone zone"): as mentioned above, @tbl:tb7 states that the joystick does not have XY values and thus implementing a deadzone would mean physical distance to click one of the 4 directional push buttons within the joystick hardware. _This may be subject to change for the Rev 1 deliverable_]
  )
  ],
  [Sub-subsystem "Display" added to each of the modules, with its purpose being to showcase the battery life. The OpenArcade team wants to note that this may or may not be included in the design for Rev 0, but is something that is planned to be included in the final design. This will be noted during the Rev 0 presentation for clarity.],
)

== Context Diagram
The context diagram does not change, as the overall goal of the controller is the same. It can be seen in @fig:fig2. This diagram is a simplified description of the controller's [input #sym.arrow output] path.
#figure(image("ContextDiagram.png"), caption: [Context diagram])<fig:fig2>
=== Functional Decomposition
The functional decomposition has also slightly changed to reword some of the processes while also including the display aspect, which again may or may not be used in Rev 0. The diagram still splits the system into two main systems and displays how they interact with each other and what is required from each of them. This can be seen in @fig:fig3.
#figure(image("FunctionalDecomposition.png", width: 60%), caption: [Functional Decomposition])<fig:fig3>
#pagebreak()
= System Design

== Variables (Monitored, Controlled, Constants)
#set table(stroke: (x, y) => if y > 0 { (bottom: 0.35pt) }, fill: (x, y) =>
if y == 0 { rgb("#7a003d") }, inset: (right: 0.75em), align: left)
=== Monitored Variables
The monitored variables are inputs to the systems. They represent the user's actions being transmitted as inputs to the ESP and the inputs to the Pi. The variables, along with their designated units (if applicable) are noted in @tbl:tb1.    
\
#v(-3mm)
#align(
  center, [
  #figure(
    table(
      columns: (20%, 64%, 16%), [#text(fill: white)[*Monitored\ Variable*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Units*]], 
      [`button_state`], [Assigned to the current state of any button on the child module. Upon key press, the button state notifies that it is on.], [True/False], 
      [`joystick_u`], [Assigned to the state of the push button corresponding to "up" on the joystick.], [True/False], 
      [`joystick_d`], [Assigned to the state of the push button corresponding to "down" on the joystick.], [True/False],
      [`joystick_l`], [Assigned to the state of the push button corresponding to "left" on the joystick.], [True/False], 
      [`joystick_r`], [Assigned to the state of the push button corresponding to "right" on the joystick.], [True/False],
      [`pair_state`], [The value that expresses the pairing feature for BLE is on (1) or off (0), along with whether the child module is connected to the parent (2)], [Unitless], 
      [`num_mods`], [The number of child modules connected in the system.], [Unitless], 
      [`temp`], [The current average temperature of the controller.], [°C], 
      [`input_delay`], [Will be used to monitor the time elapsed of a user event translating to an event on the device.], [ms],
      [`connection_time`], [The time it takes for child module to connect to parent module.], [ms],
      [`T_hb`], [Bit value to represent KA signal.], [Unitless],
      [`err_rep`], [alert packets sent when critical errors occur.], [Unitless],
      [`gpio_spd`], [The time between button press and the interrupt registering on child module (ESP32 board).], [Unitless],
    ),
    caption: [Monitored Variables],
  )<tbl:tb1>
  ],
)
\
=== Controlled Variables
Controlled variables are those that are final outputs to the system, such as the total list of connected devices, or the final HID report mapping for the device to interpret the gamepad. The variables, along with their designated units (if applicable) are noted in @tbl:tb2. 
\
#v(-3mm)
#align(
  center, [
    #figure( 
      table(
      columns: (23%, 62%, 15%), [#text(fill: white)[*Controlled\ Variables*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Units*]], 
      [`HID_Report`], [The report detailing the state of button presses and joystick orientation, and the encoding of those entries in the the format of a standardized gamepad.], [Unitless], 
      [`device_list`], [A list of current child modules connected to parent.], [Unitless], 
      [`Device_Descriptor`], [The set of fields that define what the parent module is. This includes characteristics such as: vendor ID, product ID, device class/subclass/protocol, form of communication required (HID), etc. Will change depending on the mode selected.], [Unitless], 
      /*
      [`dz_x`], [The positional range of values (in the x direction), where a user movement of the joystick within this range will not register as an input (deadzone).], [[5-15]% of joystick ADC range], 
      [`dz_y`], [The positional range of values (in the y direction), where a user movement of the joystick within this range will not register as an input (deadzone).], [[5-15]% of joystick ADC range],*/
    ),
    caption: [Controlled Variables]
    )<tbl:tb2>
  ],
)
\
=== Constant Variables

The variables, along with their designated units (if applicable) are noted in @tbl:tb3. 
\
#v(-3mm)
#align(
  center, [
    #figure(    
      table(
        columns: (20%, 65%, 15%), [#text(fill: white)[*Constant\ Variables*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Units*]], 
        /*
        [`jval_x_range`], [The range of the x axis of the joystick.], [$[-127,127]$], 
        [`jval_y_range`], [The range of the y axis of the joystick.], [$[-127,127]$],*/ 
        [`UUID`], [The unique identifier for each child module/ESP32 board.], [Unitless], [`MAC ID`], [The unique physical address for each child module/ESP32 board.], [Unitless], 
        [`connection_TO`], [A time interval that declares connection timeout if there is no communication within that interval (connection timeout).], [ms], 
        [`poll_rate`], [The frequency/rate at which the HID polling occurs.], [Hz], 
        [`temp_warning`], [The first threshold temperature of the system that will notify the user if `temp > temp_warm`], [°C], 
        [`temp_critical`], [The second threshold for temperature of the system resulting in system shutdown if `temp > temp_critical`], [°C],
    ),
    caption: [Constant Variables]
    )<tbl:tb3>
  ],
)
#pagebreak()
#set page(flipped: true)
=== 4-Variable Model 
The 4-Variable model implementing these variables can be seen in @fig:fig4, which displays the use of 4 core inputs to the system (User, BLE, Temperature, Battery) along with the corresponding modules required for successful functionality of the controller. The model shows how inputs are transformed into the outputs using various processes, which come in the form of software modules.
#figure(image("4_VARIABLE_MODEL.png", width:101.5%), caption: [OpenArcade Controller 4-Variable Model Diagram])<fig:fig4>
#pagebreak()
#set page(flipped: false)
#align(
  center, [
    #figure(
    table(
      columns: (20%, 45%), 
      [#text(fill: white)[*System Component*]], [#text(fill: white)[*Description*]],
      [CM_H],[Child module hardware component],
      [CM_S],[Child module software component],
      [PM_H],[Parent module hardware component],
      [PM_S],[Parent module software component]
      ),
      caption: [4-Variable Model Component Description]
      )<tbl:tb4>
  ],
)
#pagebreak()
== Software Design
As mentioned before, the controller is designed around the 4 variable model, which takes monitored variables and software modules that connect to controlled variables and outputs to the system, which are defined as both the screens on the parent/child modules and the game. The system contains two main subsystems: the child and parent modules. 
=== Background Information
This section describes the working process of how the system takes raw data and converts it to game actions.

When a user performs an action, such as a button press or movement of the joystick, it's state will change. On each child module, the states of each of these buttons and joysticks will be placed in a bit array (the state package) in a specified standard format so that it can be read by the parent module.

The parent module receives the state package, a state mapping configuration (if modified by the user, default otherwise), and a mode that the parent module will be in. The state mapping configuration is set by the user in an external configuration app, and will modify that the index location in the state package that is read to relate to specific inputs #list([If the first four bits of the state package are ordered as [A, B, X, Y], a user who wishes to swap the physical 'X' button to perform the 'A' action would modify the state mapping configuration so that the Button A logical function now draws its data from the third bit index rather than the first.])

This modified state configuration is coupled with the operating mode that the controller is in. Each mode corresponds to a specific HID descriptor (such as XBOX, Generic Gamepad, Nintendo), which informs the device of how to interpret the subsequent HID report from the controller. The HID report is formed by mapping the newly configured state package to a byte structure that follows the format of the descriptor. This is then transferred to the device and decoded by the HID device drivers to be read by the game. 

=== Child Module
The inputs and outputs of the child module subsystem are noted in @tbl:tb5. The goal of this subsystem is to transfer user actions to the parent module and to communicate system data to the user.
#align(
  center, [
    #figure(
    table(
      columns: (35%, 35%), 
      [#text(fill: white)[*System Inputs*]], [#text(fill: white)[*System Outputs*]],
      [Game buttons \ (8 Large + 2 small)],[State package],
      [Joystick (U, D, L, R)],[Child Module Screen],
      [Pairing Button],[],
      [Battery Life],[],
      [Temperature],[],
      ),
      caption: [Inputs and Outputs (black box description)]
      )<tbl:tb5>
  ],
)
==== Module Description
Module CM_S_STATES: receives data from the user input, and will update a state package that contains all button and joystick states. The state package is a bit array with each bit relating to the 8 large buttons, the 2 smaller buttons (start and select buttons), and the 4 joystick outputs. This state package is an output to the CM subsystem.

Module CM_S_BLE: The BLE module for the child. will have a starting advertisement on boot-up to initially try and connect to the parent. A connection timeout will  be issued in the case that there is no connection established. In that case, the module will receive data from user input of the pairing button, and will result in the child re-advertising itself via BLE so that it can connect to the parent.

Module CM_S_TEMP: Tracks internal temperature of ESP chip. If Temp exceeds a threshold set, output warning. If it exceeds a maximum then turn module off

Module CM_S_PAIR: Tracks pairing status of the device.

Module CM_S_BATTERY: Tracks battery life based on raw data.

Module CM_S_SCREEN: Will take values of the temperature, module ID, battery life, and pairing status and print onto screen.
=== Parent Module
The inputs of the parent module subsystem are defined in @tbl:tb6. The goal of the parent module subsystem is take a raw state package and convert it to an HID report that factors in the configuration set by the user (or just default), and the mode that the HID will be formatted in (set by the user).
#align(
  center, [
    #figure(
    table(
      columns: (35%, 40%), 
      [#text(fill: white)[*System Inputs*]], [#text(fill: white)[*System Outputs*]],
      [State package],[Final HID Report],
      [State mapping configuration],[HID Descriptor Mode],
      [User selected mode],[Parent Module Screen],
      [Temperature],[],
      ),
      caption: [Inputs and Outputs (black box description)]
      )<tbl:tb6>
  ],
)
==== Module Description
Module PM_S_BLE: BLE Module for the parent. Will be constantly scanning for specific device UUIDs which are written in a list. When a device is recognized, the Pi will perform handshake, which includes synchronization (to match time for data transfer), an acknowledgement from the child about this synchronization, and a confirmation acknowledgement from the parent.

Module PM_S_DEVICES: Module tracking all child devices connected to parent and sending this data to screen via SDA pin. Is updated every time a new connection is established with new UUID and MAC address added to list.

Module PM_S_TEMP: Tracks internal temperature of Raspberry Pi chip.If Temp exceeds a threshold set, output warning. If it exceeds a maximum then turn module off.

Module PM_S_MODE: Tracks the current HID mode of the device, and is changed via button PM_H1. Changing the mode will mean changing the HID Descriptor (changes the encoding so that the device can read the controller as a XBOX/PS/Nintendo Gamepad) and the HID Report format (the sequence of output bytes ordered correctly to match the specific gamepad format we are looking for).

Module PM_S_SCREEN: Will take Temperature, Devices, and Mode and print onto screen.

Module PM_S_CONFIG_APP: an external configuration app that will remap what the parent module will read from the incoming state package provided by the child module. Updates only when configuration is changed and sends a profile.

Module PM_S_CONFIG_MAP: intermediate step between PM_S_CONFIG_APP and HID_WRITE that takes the state package and consults the current mapping set either by default or through a profile set in the configuration app, giving new meaning to the bits that comprise the state package.

Module PM_S_HID_WRITE: Writes a HID report (data sequence). The report will first determine the mode (commonly referred to as the protocol that the device follows) it is in using PM_S_MODE, and then will then encode the values sent by the updated state package created from PM_S_CONFIG_MAP, to match the standard HID report formatting.

Module PM_S_STORE: saves the current configuration set from the configuration app. 
#pagebreak()
== Hardware Design
The Hardware component of the project includes the boards required to operate the controller, the buttons and joysticks, and the screen (if it is included in the Rev 0 design). Note that some of these components (such as buttons, joysticks, batteries, etc.) may be subject to change during the course of the project for more optimized options that better fit the design that the OpenArcade team visualizes. This list of components can be seen in @tbl:tb7.
\ 

#align(
  center, [
    #figure(
    table(
      columns: (20%, 60%, 20%), 
      [#text(fill: white)[*Component*]], [#text(fill: white)[*Description/Use Case*]], [#text(fill: white)[*Component Image*]],
      [Raspberry PI Zero 2W], [Parent module main board. Will use BLE to receive data from child modules and send HID report package to the device via USB connection.\ _`Operating Voltage: 4.75V-5.25V`_], [#figure(image("02w.png", width: 100%))],
      [ESP32- WROOM- 32D],[Child module main board. Will take in user input from connected joysticks/buttons, and send state package containing state changes of joysticks/buttons to parent module via BLE.\ _`Operating Voltage: 4V-12V`_],[#figure(image("ESP32.png", width: 100%))],
      [OLED Display Screen (CM_H4 and PM_H2)],[Small screen attached to the outside of the module housing. #list([Child Module: communicate the state of the child module, along with the battery life of the controller.],[Parent Module: communicate the number of devices connected.]) _`Operating Voltage: 3.3V-5V`_],[\ #figure(image("OLED_Display.png", width: 100%))],
      [Large Button (CM_H1)],[Standard arcade-style button with LED. Can act as triggers, bumpers, ABXY. \ _`Operating Voltage (LED): 5V`_],[#figure(image("Button_LRG.jpg", width: 100%))],
      [Small Button (CM_H1 and CM_H2)],[Smaller sized button used for start and select, along with pairing. \ _`Max Operating Voltage: 12V`_\ _`Current Rating: 0.5A`_],[#figure(image("Button_SML.jpg", width: 100%))],
      [Joystick (CM_H1)],[Arcade-style joystick with push buttons for each direction.\ _`Operating Voltage: 5V`_],[#figure(image("Joystick.jpg", width: 100%))],
      [4x 1.5V Battery Pack (CM_H3)],[Battery holder for 4 AA batteries.],[#figure(image("Battery_pack.png", width: 100%))],
      [Power Switch],[Switch used to turn the child module on and off. will be connected to the battery pack.],[#figure(image("SW.png", width: 100%))],
      [22 AWG Wire],[Provides electrical connections between components listed above.],[],
      ),
      caption: [Component List]
      )<tbl:tb7>
  ],
)
#pagebreak()
#set page(flipped: true)
=== Child Module

Each child module uses an ESP32 Development Board. The electrical schematic diagram of how the child module will be designed can be seen in @fig:fig5. Please note that net labels are used (name tags) on the electrical components to show direct wired connections to increase the readability of the schematic.  
#figure(image("Child_Module_ELEC.png", width: 86%), caption: [Child Module Electrical Schematic])<fig:fig5>
#pagebreak()
#set page(flipped: false)
Notes on the Design:
#list(
  [The design is meant to follow a standard that we will use in all of our boards, for better readability.],
  [Large buttons: large buttons will be designated to GPIO pins: 4, 5, 15, 16, 17, 18, 19, 23. This means that each module will have a maximum standard button count of 8, which covers basic bumpers ("LB/RB")/trigger ("RT/LT") buttons and "ABXY". These pins will be programmed to pull-up internally, which is used to reduce the noise of the system that can be caused when moving the button from 0 to 1 rather than 1 to 0.],
  [Small buttons: small buttons will be designated to GPIO pins: 12, 14, 27, where 12 is the pairing button used in the case of a timeout to re-advertise the device, 14 is the standard "Start" and 27 is the standard "Select" buttons. These will also use the internal pull-up setup.],
  [Joystick: Joystick outputs will be designated to GPIO pins: 25, 26, 32, 33. The joystick used utilizes 4 push buttons hooked up to outputs that will be communicated to the device. A combination of these push buttons pressed will result in the corresponding diagonal output.],
  [Screen: replaces the LED indication that was mentioned in the hardware requirements. the screen is connected to the SDA and SCL pins of the ESP to allow for I2C connection between devices, in which the ESP will communicate the connectivity of the controller (`pair_state`), along with the battery life. It is to be powered by the ESP's 3V3 power supply to communicate this information to the user.],
  [Power: The ESP is to be powered by 4xAA batteries, which will be connected through switch to turn the ESP on our off. This is what will currently be used in Rev 0, but may potentially change between Rev 0 and Rev 1, such as introducing a rechargeable set of power similar to how modern controller operate. The battery life will be monitored and sent to the GPIO pin 13, so that the user can visually see the power of the controller.],
)
=== Parent Module

The parent module will consist of a Raspberry Pi Zero 2W, and will be connected to a screen. The Pi will be powered and send data through the Mirco USB ports. It is planned to connect via bluetooth to the child modules using the BLE feature provided on the Pi. The schematic can be seen in @fig:fig6. Please note that net labels are used (name tags) on the electrical components to show direct wired connections to increase the readability of the schematic. 
#figure(image("RPI_ELEC.png", width: 100%), caption: [Parent Module Electrical Schematic])<fig:fig6>
Notes on the Design:
#list(
  [The Pi will be connected to power and transfer data via usb connection to the device that it will be playing on.],
  [Screen: the screen is connected to the SDA and SCL pins of the ESP to allow for I2C connection between devices, in which the Pi will communicate the number of modules connected to the board (`device_list`). It is to be powered by the ESP's 3V3 power supply to communicate this information to the user.]
)
#pagebreak()
== Mechanical Design
#align(
  center, [
    #figure(
    table(
      columns: (40%, 60%), 
      [#text(fill: white)[*Component*]], [#text(fill: white)[*Description/Use Case*]], 
      [Raspberry PI Zero 2W], [Parent module main board.],
      [ESP32- WROOM- 32D],[Child module main board.],
      [OLED Display Screen (CM_H4 and PM_H2)],[Small screen attached to the outside of the module housing.],
      [Large Button (CM_H1)],[Standard arcade-style button with LED. ],
      [Small Button (CM_H1 and CM_H2)],[Smaller sized button used for start and select, along with pairing.],
      [Joystick (CM_H1)],[Arcade-style joystick with push buttons for each direction.],
      [4x 1.5V Battery Pack (CM_H3)],[Battery holder for 4 AA batteries.],
      [Power Switch],[Switch used to turn the child module on and off. will be connected to the battery pack.],
      [3D-printed Housing],[Housing for both the parent and child modules.],
      [Screws/nuts],[Securing the components to the housing.]
      ),
      caption: [Component List]
      )<tbl:tb8>
  ],
)
=== Child Module
=== Parent Module
= Timing Constraints
There are a few critical timing constraints to consider for the OpenArcade Controller to function correctly, which can be seen in @tbl:tb8.
#align(
  center, [
    #figure(
    table(
      columns: (20%, 40%, 40%), 
      [#text(fill: white)[*Action*]], [#text(fill: white)[*Description*]], [#text(fill: white)[*Timing Requirement*]],
      [Child Module Advertisement], [Initial advertisement on start up.\ \ Re-advertising after pairing button is clicked.], [The advertisements will run for X seconds, after which a timeout will be issued, requiring the press of the pairing button once again.],
      [Temperature Warnings],[Issue temperature warnings as soon as it reaches critical values],[No specific timing, but must report warning the moment is acknowledges abnormal temperature.],
      [User→Game action],[The time it takes to press a button and have it register in the game.],[Standard controllers work with around 10-20ms, so aiming to replicate a similar time will prevent the game from feeling slow.]
      ),
      caption: [Timing Requirements]
      )<tbl:tb9>
  ],
)
#pagebreak()
= Initialization
== Startup
The parent module (client) will be plugged into the device that the user wants to use (in most cases it will be a computer). Once the parent module is powered (via the cable connection), it will automatically start looking for advertising children modules (server). When the parent module finds a child module that is advertising, it will automatically connect. Once connected, the parent module will relay the user's input to the computer resulting in in-game actions. 

Child modules are turned on via a switch to connect power to the system, and will begin an advertising phase for a set time until timeout is declared if no connection is established.
== Termination
The parent module can be turned off by disconnecting the module from the device. Child modules can be turned off via a power switch, which will disconnect the established BLE connection between the parent and child (removing it from the parent device list).

In the case that the temperature of the parent or child exceeds a warning or critical temperature (threshold set by manufacturer), the module will shut off and will be reuseable once the temperature is safe.

In the case of battery depletion, the child module will be turned off automatically, which will disconnect the BLE connection with the parent.
#pagebreak()
= Operation
== Normal Operation
The OpenArcade controller is designed with the intention to provide users a modular and accessible gaming interface that removes some of the physical constraints present in traditional controllers. The design allows for users to be able to place the modules in any way they like, as long as it is within a reasonable range for BLE connection.

During normal operation, the parent will load up a state mapping configuration (if it differs from the default), and establish a connection with the host device, which will relay the HID information of the user when an operating mode is selected. The parent module will be continuously scanning for child modules. Child modules will be seamlessly connected to the parent upon activation.

When using the configuration app, users will be able to intuitively remap the physical inputs of the system (buttons). This is all passed to the parent module, which will update the HID report accordingly. On the host device, the new mapping will be treated as the native layout, as if the controller was always set up in this way. 

== Undesired Event Handling

