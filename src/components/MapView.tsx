import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTroops } from "../hooks/useTroops";
import { Capacitor } from '@capacitor/core';

const MapView = () => {
  const mapRef = useRef<L.Map | null>(null);
  const troopMarkers = useRef<Record<string, L.Marker>>({});
  const troops = useTroops();

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map").setView([10.625, 122.584], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
    }

    // Update markers
    troops.forEach((troop) => {
      const existingMarker = troopMarkers.current[troop.id];
      const isEmergency = troop.status === 'Emergency';

      // Create a more professional popup with fallbacks
      const popupHtml = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 700; font-size: 14px; color: #1f2937; margin-bottom: 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">
            ${troop.name || 'Unknown Officer'}
          </div>
          ${troop.rank ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 6px;"><strong>Rank:</strong> ${troop.rank}</div>` : ''}
          ${troop.station ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 6px;"><strong>Station:</strong> ${troop.station}</div>` : ''}
          ${troop.badgeNumber ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 6px;"><strong>Badge:</strong> ${troop.badgeNumber}</div>` : ''}
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 6px;"><strong>Contact:</strong> ${troop.contact || 'Not available'}</div>
          ${isEmergency ? `
            <div style="font-size: 12px; color: #dc2626; margin-bottom: 6px; font-weight: 700; background: #fef2f2; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #dc2626;">
              🚨 Status: Emergency Triggered!
            </div>
          ` : ''}
          ${troop.lastUpdated ? `
            <div style="font-size: 10px; color: #374151; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-weight: 700; opacity: 0.9; line-height: 1.2; display: flex; align-items: center; gap: 6px;">
              <span style="color: #10b981;">📍</span> Last updated: ${new Date(troop.lastUpdated).toLocaleString()}
            </div>
          ` : ''}
        </div>
      `;

      // Determine colors based on emergency status
      const borderColor = isEmergency ? '#dc2626' : '#3b82f6';
      const liveIndicatorColor = isEmergency ? '#dc2626' : '#10b981';

      // Create custom icon with name label and pulsing effect
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <!-- Pulsing ring effect -->
            <div style="
              position: absolute;
              top: -6px;
              left: -6px;
              width: 28px;
              height: 28px;
              border: 3px solid ${borderColor};
              border-radius: 50%;
              animation: ${isEmergency ? 'emergencyPulse 1s infinite' : 'pulse 2s infinite'};
              opacity: 0.6;
            "></div>
            <!-- Main marker -->
            <div style="
              background: white; 
              border: 3px solid ${borderColor}; 
              border-radius: 50%; 
              width: 16px; 
              height: 16px; 
              position: relative;
              box-shadow: 0 3px 6px rgba(0,0,0,0.3);
              z-index: 2;
            ">
              <!-- Live indicator dot -->
              <div style="
                position: absolute;
                top: 1px;
                right: 1px;
                width: 8px;
                height: 8px;
                background: ${liveIndicatorColor};
                border-radius: 50%;
                animation: ${isEmergency ? 'emergencyBlink 0.5s infinite' : 'blink 1s infinite'};
              "></div>
            </div>
            <!-- Name label -->
            <div style="
              margin-top: 6px;
              background: ${isEmergency ? 'rgba(220,38,38,0.9)' : 'rgba(0,0,0,0.8)'};
              color: white;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              white-space: nowrap;
              z-index: 1000;
              font-family: system-ui, sans-serif;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ${troop.name || 'Unknown'}
            </div>
          </div>
          <style>
            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: 0.6;
              }
              50% {
                transform: scale(1.2);
                opacity: 0.3;
              }
              100% {
                transform: scale(1);
                opacity: 0.6;
              }
            }
            @keyframes emergencyPulse {
              0% {
                transform: scale(1);
                opacity: 0.8;
              }
              50% {
                transform: scale(1.4);
                opacity: 0.4;
              }
              100% {
                transform: scale(1);
                opacity: 0.8;
              }
            }
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0.3; }
            }
            @keyframes emergencyBlink {
              0%, 30% { opacity: 1; }
              31%, 100% { opacity: 0.2; }
            }
          </style>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (existingMarker) {
        // Update existing marker with new position and icon
        existingMarker.setLatLng([troop.lat, troop.lng]).setPopupContent(popupHtml).setIcon(customIcon);
      } else {
        const newMarker = L.marker([troop.lat, troop.lng], { icon: customIcon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml);

        // Enhanced hover behavior with popup interaction
        let popupTimeout: NodeJS.Timeout | null = null;
        let isPopupHovered = false;

        newMarker.on("mouseover", function () {
          if (popupTimeout) {
            clearTimeout(popupTimeout);
            popupTimeout = null;
          }
          newMarker.openPopup();
        });

        newMarker.on("mouseout", function () {
          // Only close popup if not hovering over the popup itself
          if (!isPopupHovered) {
            popupTimeout = setTimeout(() => {
              if (!isPopupHovered) {
                newMarker.closePopup();
              }
            }, 150); // Small delay to allow moving to popup
          }
        });

        // Add popup hover events after popup is created
        newMarker.on("popupopen", function () {
          const popupElement = newMarker.getPopup()?.getElement();
          if (popupElement) {
            popupElement.addEventListener("mouseenter", () => {
              isPopupHovered = true;
              if (popupTimeout) {
                clearTimeout(popupTimeout);
                popupTimeout = null;
              }
            });

            popupElement.addEventListener("mouseleave", () => {
              isPopupHovered = false;
              popupTimeout = setTimeout(() => {
                if (!isPopupHovered) {
                  newMarker.closePopup();
                }
              }, 150);
            });
          }
        });

        troopMarkers.current[troop.id] = newMarker;
      }
    });

    // Remove markers for users no longer in troops
    Object.keys(troopMarkers.current).forEach((id) => {
      if (!troops.find((troop) => troop.id === id)) {
        troopMarkers.current[id].remove();
        delete troopMarkers.current[id];
      }
    });
  }, [troops]);

  // Determine positioning based on platform
  const isNative = Capacitor.isNativePlatform();
  const mapContainerClass = isNative 
    ? "fixed top-0 left-0 w-full h-full z-0" 
    : "fixed top-12 left-0 w-full h-[calc(100vh-48px)] z-0";

  return (
    <div className={mapContainerClass}>
      <div id="map" className="w-full h-full"></div>
    </div>
  );
};

export default MapView;
 