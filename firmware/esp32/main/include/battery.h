#ifndef BATTERY_H
#define BATTERY_H


#define BATTERY_ADC_CHANNEL ADC_CHANNEL_6 //This is the ADC channel for GPIO34

#define BATTERY_PACK_MAX_VOLT 6
#define BATTERY_PACK_EMPTY_VOLT 4.4

#define BATTERY_DISPLAY_INCREMENTS 4 //determines how often we want to show battery drop (so 4 -> 100/4 = every 25%)

#define R1 100000
#define R2 100000
#define VOLTAGE_DIVIDER_RATIO ((R1+R2)/R1)

#define DMAX 4096
#define ADC_VREF 3.3


#endif
