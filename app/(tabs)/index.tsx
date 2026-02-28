import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [dbMessage, setDbMessage] = useState("");

  const testConnection = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_connection")
      .select("*")
      .single();
    if (error) {
      setDbMessage(`Error: ${error.message}`);
    } else {
      setDbMessage(`Conexión exitosa: ${JSON.stringify(data)}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Estado Nido
          </Text>
          {loading ? (
            <ActivityIndicator animating={true} color="#a78bfa" />
          ) : (
            <View>
              <Text variant="bodyLarge" style={styles.message}>
                {dbMessage}
              </Text>
              <Button mode="contained" onPress={testConnection}>
                Re-intentar
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  card: {
    padding: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    textAlign: "center",
    marginVertical: 20,
    color: "#f0f0f0",
  },
});
