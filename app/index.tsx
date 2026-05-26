import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/base/Text';
import { useTheme } from '@/design-system/useTheme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text variant="displayHeroMobile" color="counterPrimary">
        StepApp
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
