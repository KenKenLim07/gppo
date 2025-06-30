# Emergency Button Feature

## Overview
The emergency button feature allows officers to quickly signal an emergency situation to the command center without requiring additional input. When triggered, it immediately updates the officer's status and provides visual indicators on the admin dashboard and map.

## Features

### Mobile Emergency Button
- **Location**: Fixed position at bottom-right of mobile screen
- **Trigger**: Single tap to activate emergency status
- **Visual Feedback**: 
  - Red circular button with 🚨 emoji
  - Loading spinner during activation
  - Changes to checkmark (✓) when active
  - "EMERGENCY ACTIVE" label appears
- **Auto-reset**: Automatically resets after 30 seconds
- **Manual Reset**: Tap the checkmark to manually clear emergency status

### Web Emergency Button (Testing)
- **Location**: In the top navigation bar (web only)
- **Style**: Compact button with "🚨 EMERGENCY" text
- **Changes to**: "CLEAR" button when active

### Map Visualization
- **Emergency Markers**: Red border and pulsing effect
- **Faster Animation**: Emergency pulse is 1s vs 2s for normal
- **Red Live Indicator**: Changes from green to red
- **Red Name Label**: Background changes to red
- **Popup Alert**: Shows "🚨 Status: Emergency Triggered!" in red

### Admin Dashboard
- **Status Badge**: Shows emergency status with red styling and animation
- **User Table**: Emergency users highlighted with red status badges
- **User Details Modal**: Enhanced status display with emergency indicators

## Firebase Data Structure

When emergency is triggered, the following fields are updated in `users/{uid}`:

```json
{
  "status": "Emergency",
  "emergencyTriggeredAt": 1703123456789,
  "lastUpdated": 1703123456789
}
```

When emergency is cleared:

```json
{
  "status": "Active",
  "emergencyTriggeredAt": null,
  "lastUpdated": 1703123456789
}
```

## Implementation Details

### Components
- `EmergencyButton.tsx`: Main emergency button component with mobile/web variants
- `MapView.tsx`: Updated to handle emergency status visualization
- `MobileNavigation.tsx`: Includes emergency button for mobile
- `NavBar.tsx`: Includes emergency button for web testing
- `AdminDashboard.tsx`: Updated to display emergency status

### Hooks
- `useTroops.ts`: Updated to include `emergencyTriggeredAt` field

### Styling
- Emergency markers use red color scheme (#dc2626)
- Pulsing animations are faster for emergency (1s vs 2s)
- Live indicator blinks faster (0.5s vs 1s)
- Name labels have red background for emergency status

## Usage

### For Officers
1. Open the mobile app
2. Tap the red emergency button (🚨) in the bottom-right corner
3. The button will show loading, then change to a checkmark
4. Emergency status is now active and visible to command center
5. Tap the checkmark to manually clear, or wait 30 seconds for auto-clear

### For Command Center
1. View the admin dashboard or map
2. Officers with emergency status will be highlighted in red
3. Emergency markers on the map will have red styling and faster animations
4. Click on emergency markers to see detailed status in popup

## Security Considerations
- Emergency status is tied to authenticated user UID
- Status updates are logged with timestamps
- No additional confirmation required for quick response
- Auto-reset prevents false alarms from persisting

## Future Enhancements
- Audio alerts for command center
- Push notifications for emergency triggers
- Emergency response workflow integration
- Historical emergency event logging
- Emergency contact notifications 