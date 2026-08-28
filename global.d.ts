declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const Button: any;
  export const StyleSheet: any;
  export const Alert: any;
  export const FlatList: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module '@react-navigation/native' {
  export const NavigationContainer: any;
}

declare module '@react-navigation/stack' {
  export type StackScreenProps<ParamList extends object, RouteName extends keyof ParamList> = any;
  export function createStackNavigator<T extends object>(): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
