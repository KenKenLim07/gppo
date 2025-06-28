import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTroops } from "../hooks/useTroops";

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
          ${troop.lastUpdated ? `
            <div style="font-size: 10px; color: #374151; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-weight: 700; opacity: 0.9; line-height: 1.2; display: flex; align-items: center; gap: 6px;">
              <span style="color: #10b981;">📍</span> Last updated: ${new Date(troop.lastUpdated).toLocaleString()}
            </div>
          ` : ''}
        </div>
      `;

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
              border: 3px solid #3b82f6;
              border-radius: 50%;
              animation: pulse 2s infinite;
              opacity: 0.6;
            "></div>
            <!-- Main marker -->
            <div style="
              background: white; 
              border: 3px solid #3b82f6; 
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
                background: #10b981;
                border-radius: 50%;
                animation: blink 1s infinite;
              "></div>
            </div>
            <!-- Name label -->
            <div style="
              margin-top: 6px;
              background: rgba(0,0,0,0.8);
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
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0.3; }
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

        // Add hover effect
        newMarker.on("mouseover", function () {
          newMarker.openPopup();
        });
        newMarker.on("mouseout", function () {
          newMarker.closePopup();
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

  return (
    <div className="fixed top-12 left-0 w-full h-[calc(100vh-48px)] z-0">
      <div id="map" className="w-full h-full"></div>
    </div>
  );
};

export default MapView;
