import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * پوسته‌ی برنامه. در ادامه‌ی پروژه، Provider‌های وضعیت، سرویس‌ها و ناوبری در
 * همین فایل سوار می‌شوند.
 */
function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>کلمه‌ساز</Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F3EA',
    direction: 'rtl',
  },
  title: {
    fontSize: 28,
    color: '#2F2A3F',
  },
});

export default App;
