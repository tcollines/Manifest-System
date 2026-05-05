import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Settings, ArrowLeft } from 'lucide-react';
import { useNotificationStore } from '../../database/NotificationStore';
import { useAuth } from "../../context/AuthContext";
import { subscribeToPush, unsubscribeFromPush, checkPushStatus, getPushPreferences, updatePushPreferences } from '../../services/pushService';


export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [preferences, setPreferences] = useState({
    workplan_updates: true,
    requisition_updates: true,
    payments: true
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    subscribe,
    unsubscribe
  } = useNotificationStore();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      subscribe(user.id);

      // Always re-check directly from the browser — don't trust localStorage
      checkPushStatus().then(setPushEnabled);
      getPushPreferences().then(data => {
        if (data) setPreferences(data);
      }).catch(console.error);
    }
    return () => { unsubscribe(); };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const handleTogglePush = async () => {
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        await subscribeToPush();
        // Re-verify the browser actually holds a subscription before marking enabled
        const confirmed = await checkPushStatus();
        setPushEnabled(confirmed);
        if (!confirmed) {
          alert('Push notification setup failed. Please try again.');
        }
      }
    } catch (e: any) {
      console.error('Failed to toggle push notifications:', e);
      const msg = e?.message || 'Unknown error';
      if (msg.includes('denied')) {
        alert('Notifications are blocked. Please enable them in your browser settings.');
      } else {
        alert(`Failed to enable push notifications: ${msg}`);
      }
    }
  };

  const handlePreferenceChange = async (key: keyof typeof preferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    try {
      await updatePushPreferences(newPrefs);
    } catch (e) {
      console.error('Failed to update preferences:', e);
      // Revert on fail
      setPreferences(preferences);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          {!showSettings ? (
            <>
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      className="text-xs text-ministry-orange hover:text-ministry-text font-medium flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-4 transition-colors hover:bg-gray-50 ${!notification.read ? 'bg-orange-50/30' : ''}`}
                        onClick={() => {
                          if (!notification.read) markAsRead(notification.id);
                          if (notification.url) {
                            setIsOpen(false);
                            navigate(notification.url);
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="flex-1 cursor-pointer">
                            <p className={`text-sm ${!notification.read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-ministry-orange flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h3 className="font-semibold text-gray-900">Notification Settings</h3>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                    <p className="text-xs text-gray-500">Receive alerts on your device</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={pushEnabled} onChange={handleTogglePush} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ministry-orange"></div>
                  </label>
                </div>
                
                {pushEnabled && (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preferences</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Workplan Updates</span>
                      <input type="checkbox" checked={preferences.workplan_updates} onChange={() => handlePreferenceChange('workplan_updates')} className="rounded text-ministry-orange focus:ring-ministry-orange" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Requisition Updates</span>
                      <input type="checkbox" checked={preferences.requisition_updates} onChange={() => handlePreferenceChange('requisition_updates')} className="rounded text-ministry-orange focus:ring-ministry-orange" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Payment Alerts</span>
                      <input type="checkbox" checked={preferences.payments} onChange={() => handlePreferenceChange('payments')} className="rounded text-ministry-orange focus:ring-ministry-orange" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

