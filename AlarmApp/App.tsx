import React from 'react';
import {StatusBar} from 'react-native';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#11111B" />
      <HomeScreen />
    </>
  );
}
