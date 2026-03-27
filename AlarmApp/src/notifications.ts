import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';
import {Alarm} from './types';

export function initNotifications(): void {
  PushNotification.configure({
    onNotification: () => {},
    requestPermissions: Platform.OS === 'ios',
  });

  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'alarm-channel',
        channelName: 'Alarm',
        channelDescription: 'Alarm notifications',
        importance: 5,
        vibrate: true,
      },
      () => {},
    );
  }
}

export function scheduleAlarm(alarm: Alarm): void {
  cancelAlarm(alarm.id);

  if (!alarm.enabled) {
    return;
  }

  const now = new Date();
  const trigger = new Date();
  trigger.setHours(alarm.hour, alarm.minute, 0, 0);
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  PushNotification.localNotificationSchedule({
    id: alarm.id,
    channelId: 'alarm-channel',
    title: 'アラーム',
    message: alarm.label || `${pad(alarm.hour)}:${pad(alarm.minute)}`,
    date: trigger,
    allowWhileIdle: true,
    repeatType: 'day',
  });
}

export function cancelAlarm(id: string): void {
  PushNotification.cancelLocalNotification(id);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
