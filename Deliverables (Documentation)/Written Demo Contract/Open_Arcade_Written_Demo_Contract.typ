#set page("us-letter")
#set text(size: 12pt, font: "New Computer Modern")


#grid(
  columns: (1fr, 1fr),
  gutter: -8cm,
  align(left)[
    #text(size: 14pt, fill: maroon, weight: "semibold")[OpenArcade | Group 3]
    #v(-2.5mm)
    Anish Paramsothy, paramsa\
    Chris Palermo, palerc1\
    Mitchel Cox, coxm12\
    Shivom Sharma, shars119\
    Jacqueline Leung, leungw18],
  align(right)[
    #image("m24-col_png.png", width: 40%)
  ]
)

#align(center, [
  #v(6cm)
  #text(size: 35pt, weight: "bold")[Demo Contract]\
  #v(2mm)
  #text(size: 14pt)[MECHTRON 4TB6, McMaster University]
])

#v(8cm)

#align(left, [
  *Date Submitted:* October 31, 2025\
  *Due Date:* October 31, 2025
])

#pagebreak()
#set page(numbering: "-- 1 --")

#set page(
  header-ascent: 5.5mm,
  header: [
    #align(top, grid(
      columns: (1fr, 1fr, 1fr),
      inset: (top: 15mm),
      align(left)[#text(fill: maroon)[OPENARCADE]],
      align(center)[#text(fill: maroon)[Demo Contract]],
      align(right)[#text(fill: maroon)[MECHTRON 4TB6]],
    ))
  
    #rect(width: 100%, height: 0.15mm, fill: black)
  ]
)

#text(size: 18pt, weight: "bold")[Contents]\ 
#outline(
  title: [],
  indent: 10mm
)

#pagebreak()

= 1 Glossary
#v(5mm)
#list(
  [#text(fill: maroon)[Module: ]a unit that contains electronics (microcontroller and wiring), that will communicate inputs to another device.],
  [#text(fill: maroon)[Parent Module: ]describes the central hub that children modules will communicate to. This
 parent module will connect to a computer/console to communicate to the game.],
  [#text(fill: maroon)[Child Module: ]describes a unit that may contain joysticks, buttons, d-pads, etc. These will communicate the inputs to the parent module and then to the game. ],

)
= 2 Introduction
#v(5mm)
The goals outlined in the following contract are meant to be evaluated at the end of the projects timeline in order to assess the success of the project, while also keeping the OpenArcade team accountable.
= 3 Project Description
#v(5mm)
Design and development of an arcade/box style controller series of children modules that can be mechanically connected to each other allowing gamers to develop their own combination and style of controller. Along with the idea that gamers can combine children modules together, we want to give them the option to play using the children modules separately. The children modules will be connected to a parent module via bluetooth to communicate the inputs of the children modules to the game.

= 4 Project Goals
#v(5mm)
There are several goals that we wish to strive towards during the completion of the OpenArcade game controller. The main critical points are listed below:

#list( spacing: 1em,
  [#text(fill: maroon)[Modular/Customizable:] the child modules will be connected to each other mechanically to form a full controller. These child modules will be usable as individual modules too and do not require the user to physically connect several child modules together. If they are connected together however, they will have the ability to connect in different orientations (such as child modules A and B connecting in A-B or B-A formats).],
  [#text(fill: maroon)[Connectivity/Performance:] the child modules will be connected to a parent module via bluetooth. The parent module will be able to connect to a variety of devices. The group will aim to reduce the input delay as much as possible between a key press and the corresponding output on external device.],
  [#text(fill: maroon)[Power:] the child modules will be individually powered and will be sustainable for several hours.],
  [#text(fill: maroon)[Comfort/Accessibility:] the controller will be comfortable and accessible to various users, reducing the hand warping required to play on a regular controller, while also providing multiple options for components like joysticks.]
)

= 5 Contributors
#v(5mm)
The OpenArcade team plans to carry out these goals and will consult the professors or TAs if any changes are required to be made in the project plan during the development process. 

#v(0.3cm)

#align(center)[
  #text(size: 16pt,fill: maroon)[The OpenArcade Team:] \
  #grid(
    columns: (1fr, 1fr),
    gutter: -8cm,
    [ 
      Anish Paramsothy \
      Chris Palermo \
      Jacqueline Leung \
      Mitchel Cox \
      Shivom Sharma
    ],
    [
      30/10/2025 \
      30/10/2025 \
      30/10/2025 \
      30/10/2025 \
      30/10/2025 \
    ]
  )
]
