import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useTroops } from "../hooks/useTroops";
import { Capacitor } from '@capacitor/core';
import ChatModal from "./ChatModal";
import { useAuth } from "../contexts/AuthContext";
import { ref, set, get } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useLocation } from '../contexts/LocationContext';

// Emoji for each unit type
const unitTypeEmojis: Record<string, string> = {
  'Mobile Patrol': '🚓',
  'TOC': '🏢',
  'Motorcycle': '🏍️',
  'Checkpoint': '🚧',
};

// Helper to base64 encode Unicode (emoji) SVG
function toBase64Unicode(str: string) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

type UnitTypeKey = 'Mobile Patrol' | 'TOC' | 'Motorcycle' | 'Checkpoint';
function isUnitTypeKey(key: any): key is UnitTypeKey {
  return key === 'Mobile Patrol' || key === 'TOC' || key === 'Motorcycle' || key === 'Checkpoint';
}

// Helper: check if a troop is live (heartbeat within 20 min)
function isTroopLive(lastUpdated?: number) {
  if (!lastUpdated) return false;
  const now = Date.now();
  return now - lastUpdated < 20 * 60 * 1000; // 20 minutes
}

function getOfficerSVGMarker({ unitType, isEmergency, name, isLive }: { unitType: string, isEmergency: boolean, name: string, isLive: boolean }) {
  const emoji = unitTypeEmojis[unitType] || '🚓';
  // Use blue by default, red if emergency, grey if offline
  const mainColor = !isLive ? '#6b7280' : (isEmergency ? '#dc2626' : '#3b82f6');
  const animDuration = isEmergency ? '0.7s' : '1.1s';
  const hollowOpacity = isEmergency ? 0.5 : 0.35;
  const dotOpacity = isEmergency ? 1 : (!isLive ? 0.5 : 0.7);
  const animatePulse = isLive;
  const centerDotColor = !isLive ? '#9ca3af' : '#22c55e'; // grey if offline, green if live
  // 44x76 marker, tip at (22, 62)
  // Name label below marker (SVG foreignObject for HTML styling)
  const nameLabel = name ? `
    <foreignObject x="0" y="62" width="44" height="14" overflow="visible">
      <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;justify-content:center;align-items:center;width:100%;height:100%;overflow:visible;">
        <span style="font-size:9px;line-height:1.1;font-weight:600;color:#222;background:#fff;padding:1px 4px;border-radius:6px;border:1.5px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.07);white-space:nowrap;max-width:100%;text-overflow:ellipsis;overflow:hidden;">${name}</span>
      </div>
    </foreignObject>
  ` : '';
  return `
    <svg width="44" height="76" viewBox="0 0 44 76" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="22" y="28" text-anchor="middle" font-size="28" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiOne, sans-serif" fill="#222">${emoji}</text>
      <!-- Pulsing hollow (mainColor) -->
      <circle cx="22" cy="50" r="9" fill="none" stroke="${mainColor}" stroke-width="3" opacity="${hollowOpacity}">
        ${animatePulse ? `<animate attributeName="r" values="9;13;9" dur="${animDuration}" repeatCount="indefinite" />` : ''}
      </circle>
      <!-- Blinking dot -->
      <circle cx="22" cy="50" r="7" fill="#fff" stroke="${mainColor}" stroke-width="3"/>
      <circle cx="22" cy="50" r="4" fill="${centerDotColor}" opacity="${dotOpacity}">
        ${animatePulse ? `<animate attributeName="opacity" values="${dotOpacity};0.3;${dotOpacity}" dur="${animDuration}" repeatCount="indefinite" />` : ''}
      </circle>
      ${nameLabel}
    </svg>
  `;
}

const statusOptions = ["On Patrol", "On Break", "Unavailable"];

const statusColors: Record<string, string> = {
  "On Patrol": "bg-green-500",
  "On Break": "bg-yellow-500",
  "Unavailable": "bg-gray-500",
};

const MapView = () => {
  const mapRef = useRef<L.Map | null>(null);
  const troopMarkers = useRef<Record<string, L.Marker>>({});
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const troops = useTroops();
  const [chatOpen, setChatOpen] = useState(false);
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("On Patrol");
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const { locationData } = useLocation();

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map").setView([10.625, 122.584], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
      markerClusterGroupRef.current = L.markerClusterGroup({
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="custom-cluster">${count}</div>`,
            className: 'my-black-cluster',
            iconSize: [28, 28]
          });
        }
      });
      mapRef.current.addLayer(markerClusterGroupRef.current);
    }

    // Update markers
    if (markerClusterGroupRef.current) {
      markerClusterGroupRef.current.clearLayers();
    }
    troops.filter(troop => !troop.isHiddenFromMap).forEach((troop) => {
      const existingMarker = troopMarkers.current[troop.id];
      const isEmergency = troop.status === 'Emergency';

      // Status badge color logic
      const statusColors: Record<string, string> = {
        'On Patrol': '#22c55e', // green
        'On Break': '#eab308', // yellow
        'Responding': '#3b82f6', // blue
        'Unavailable': '#6b7280', // gray
        'Emergency': '#dc2626', // red
      };
      const statusColor = statusColors[troop.status as keyof typeof statusColors] || '#6b7280';
      const statusLabel = troop.status || 'On Patrol';
      const isCurrentUser = troop.id === user?.uid;
      const displayName = troop.name || 'Unknown Officer';
      const popupHtml = `
        <div style="min-width: 180px; font-family: system-ui, sans-serif; padding: 6px 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 13px; color: #1f2937; margin-bottom: 4px; border-bottom: 1px solid #d1d5db; padding-bottom: 2px;">
            <span>${displayName}</span>
            <span style="
              display: inline-block;
              font-size: 10px;
              font-weight: 600;
              background: ${statusColor};
              color: #fff;
              border-radius: 8px;
              padding: 2px 8px;
              margin-left: 8px;
              min-width: 60px;
              text-align: center;
              letter-spacing: 0.5px;
            ">${statusLabel}</span>
          </div>
          ${troop.rank ? `<div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;"><strong>Rank:</strong> ${troop.rank}</div>` : ''}
          ${troop.unitType ? `<div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;"><strong>Unit:</strong> ${troop.unitType}</div>` : ''}
          ${troop.callSign ? `<div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;"><strong>Call Sign:</strong> ${troop.callSign}</div>` : ''}
          ${troop.shift ? `<div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;"><strong>Shift:</strong> ${troop.shift}</div>` : ''}
          ${troop.station ? `<div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;"><strong>Station:</strong> ${troop.station}</div>` : ''}
          <div style="font-size: 11px; color: #4b5563; margin-bottom: 2px;"><strong>Contact:</strong> ${troop.contact || 'Not available'}</div>
          ${isEmergency ? `
            <div style="font-size: 11px; color: #dc2626; margin-bottom: 2px; font-weight: 700; background: #fef2f2; padding: 2px 4px; border-radius: 3px; border-left: 2px solid #dc2626;">
              🚨 Emergency!
            </div>
          ` : ''}
          ${troop.lastUpdated ? `
            <div style="font-size: 9px; color: #374151; margin-top: 4px; padding-top: 2px; border-top: 1px solid #e5e7eb; font-weight: 700; opacity: 0.9; line-height: 1.2; display: flex; align-items: center; gap: 4px;">
              <span style="margin-right: 4px;">📅 ${new Date(troop.lastUpdated).toLocaleDateString()}</span>
              <span>⏰ ${new Date(troop.lastUpdated).toLocaleTimeString()}</span>
            </div>
          ` : ''}
          <div style="margin-top: 8px; text-align: right;">
            <a href="https://www.google.com/maps?q=${troop.lat},${troop.lng}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #2563eb; text-decoration: underline; font-weight: 600;">View in Google Maps</a>
          </div>
        </div>
      `;

      // Defensive: ensure unitType is a valid key
      const safeUnitType: UnitTypeKey = isUnitTypeKey(troop.unitType) ? troop.unitType : 'Mobile Patrol';
      const isLive = isTroopLive(troop.lastUpdated);
      const svgString = getOfficerSVGMarker({ unitType: safeUnitType, isEmergency, name: isCurrentUser ? 'You' : troop.name || '', isLive });
      const svgUrl = "data:image/svg+xml;base64," + toBase64Unicode(svgString);
      const customIcon = L.icon({
        iconUrl: svgUrl,
        iconSize: [44, 76],
        iconAnchor: [22, 62], // tip of the pin
        popupAnchor: [0, -62],
      });

      if (existingMarker) {
        // Update existing marker with new position and icon
        existingMarker.setLatLng([troop.lat, troop.lng]).setPopupContent(popupHtml).setIcon(customIcon);
        if (markerClusterGroupRef.current && !markerClusterGroupRef.current.hasLayer(existingMarker)) {
          markerClusterGroupRef.current.addLayer(existingMarker);
        }
      } else {
        const newMarker = L.marker([troop.lat, troop.lng], { icon: customIcon })
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
        if (markerClusterGroupRef.current) {
          markerClusterGroupRef.current.addLayer(newMarker);
        }
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

  // Fetch current status on mount
  useEffect(() => {
    if (!user) return;
    const profileRef = ref(realtimeDb, `users/${user.uid}`);
    get(profileRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStatus(data.status || "On Patrol");
      }
    });
  }, [user]);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setStatusLoading(true);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      if (!user) throw new Error("Not authenticated");
      await set(ref(realtimeDb, `users/${user.uid}/status`), newStatus);
      setStatusSuccess("Status updated");
      setTimeout(() => setStatusSuccess(null), 1200);
      setTimeout(() => setStatusModalOpen(false), 400);
    } catch (err: any) {
      setStatusError("Failed to update status");
      setTimeout(() => setStatusError(null), 2000);
    } finally {
      setStatusLoading(false);
    }
  };

  // Determine positioning based on platform
  const isNative = Capacitor.isNativePlatform();
  const mapContainerClass = isNative 
    ? "fixed top-0 left-0 w-full h-full z-0" 
    : "fixed top-12 left-0 w-full h-[calc(100vh-48px)] z-0";

  return (
    <div className={mapContainerClass}>
      <div id="map" className="w-full h-full"></div>
      {/* Floating Chat Button */}
      <button
        className="fixed bottom-40 left-4 z-[10010] bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-2xl"
        onClick={() => setChatOpen(true)}
        aria-label="Open Chat"
      >
        <span>💬</span>
      </button>
      {/* Floating Status Button */}
      {user && (
        <div
          className="fixed bottom-24 left-4 z-[10011] flex flex-col items-start"
        >
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-white font-semibold text-sm focus:outline-none transition-all ${statusColors[status] || "bg-gray-500"}`}
            onClick={() => setStatusModalOpen(true)}
            aria-label="Update Status"
          >
            <span className="w-2 h-2 rounded-full bg-white/80 mr-1" />
            {status}
          </button>
        </div>
      )}
      {/* Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-xs p-6 flex flex-col items-center relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl"
              onClick={() => setStatusModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Update Status</div>
            <div className="flex flex-col gap-3 w-full">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  className={`w-full py-3 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition border ${status === option ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/10"}`}
                  onClick={() => handleStatusChange(option)}
                  disabled={statusLoading}
                >
                  <span className={`w-3 h-3 rounded-full ${statusColors[option]}`}></span>
                  {option}
                </button>
              ))}
            </div>
            {statusLoading && <div className="text-xs text-gray-400 mt-4">Updating...</div>}
            {statusSuccess && <div className="text-xs text-green-600 mt-4">{statusSuccess}</div>}
            {statusError && <div className="text-xs text-red-600 mt-4">{statusError}</div>}
          </div>
        </div>
      )}
      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default MapView;
 