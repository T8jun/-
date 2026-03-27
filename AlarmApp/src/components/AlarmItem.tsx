import React from 'react';
import {View, Text, Switch, TouchableOpacity, StyleSheet} from 'react-native';
import {Alarm} from '../types';

interface Props {
  alarm: Alarm;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function AlarmItem({alarm, onToggle, onDelete}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={[styles.time, !alarm.enabled && styles.disabled]}>
          {pad(alarm.hour)}:{pad(alarm.minute)}
        </Text>
        {alarm.label ? (
          <Text style={styles.label}>{alarm.label}</Text>
        ) : null}
      </View>
      <View style={styles.controls}>
        <Switch
          value={alarm.enabled}
          onValueChange={v => onToggle(alarm.id, v)}
          trackColor={{false: '#555', true: '#6C63FF'}}
          thumbColor={alarm.enabled ? '#fff' : '#ccc'}
        />
        <TouchableOpacity onPress={() => onDelete(alarm.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>削除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  time: {
    fontSize: 40,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 2,
  },
  disabled: {
    color: '#555',
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  controls: {
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteText: {
    color: '#FF6B6B',
    fontSize: 12,
  },
});
