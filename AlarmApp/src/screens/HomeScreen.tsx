import React, {useCallback, useEffect, useState} from 'react';
import {
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Alarm} from '../types';
import {loadAlarms, saveAlarms} from '../storage';
import {cancelAlarm, initNotifications, scheduleAlarm} from '../notifications';
import AlarmItem from '../components/AlarmItem';

let idCounter = Date.now();

function newId(): string {
  return String(idCounter++);
}

export default function HomeScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [label, setLabel] = useState('');

  useEffect(() => {
    initNotifications();
    loadAlarms().then(setAlarms);
  }, []);

  const persist = useCallback(async (next: Alarm[]) => {
    setAlarms(next);
    await saveAlarms(next);
  }, []);

  const openAddModal = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    setPickerDate(d);
    setLabel('');
    setShowPicker(Platform.OS === 'ios');
    setModalVisible(true);
  };

  const handleAdd = async () => {
    const alarm: Alarm = {
      id: newId(),
      hour: pickerDate.getHours(),
      minute: pickerDate.getMinutes(),
      enabled: true,
      label,
    };
    const next = [...alarms, alarm].sort(
      (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
    );
    scheduleAlarm(alarm);
    await persist(next);
    setModalVisible(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const next = alarms.map(a => (a.id === id ? {...a, enabled} : a));
    const alarm = next.find(a => a.id === id)!;
    if (enabled) {
      scheduleAlarm(alarm);
    } else {
      cancelAlarm(id);
    }
    await persist(next);
  };

  const handleDelete = async (id: string) => {
    cancelAlarm(id);
    await persist(alarms.filter(a => a.id !== id));
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>アラーム</Text>
      </View>

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>アラームがありません</Text>
          <Text style={styles.emptyHint}>+ ボタンで追加してください</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <AlarmItem
              alarm={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>アラームを追加</Text>

            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={styles.timeDisplay}
                onPress={() => setShowPicker(true)}>
                <Text style={styles.timeDisplayText}>
                  {String(pickerDate.getHours()).padStart(2, '0')}:
                  {String(pickerDate.getMinutes()).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            )}

            {showPicker && (
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, date) => {
                  if (date) {
                    setPickerDate(date);
                  }
                  if (Platform.OS === 'android') {
                    setShowPicker(false);
                  }
                }}
                textColor="#fff"
                themeVariant="dark"
              />
            )}

            <TextInput
              style={styles.labelInput}
              placeholder="ラベル（任意）"
              placeholderTextColor="#666"
              value={label}
              onChangeText={setLabel}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#11111B',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
  },
  emptyHint: {
    color: '#555',
    fontSize: 13,
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#6C63FF',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1E2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeDisplayText: {
    color: '#6C63FF',
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: 4,
  },
  labelInput: {
    backgroundColor: '#2A2A3E',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 16,
    marginBottom: 24,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2A2A3E',
    alignItems: 'center',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
