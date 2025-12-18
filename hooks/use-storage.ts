import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";

// Types
export interface Contact {
  id: string;
  name: string;
  email: string;
  outlet?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  sentAt: string;
  recipientCount: number;
}

// Storage keys
const CONTACTS_KEY = "gpress_contacts";
const ARTICLES_KEY = "gpress_articles";

// Generic hook for local storage
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(key).then((data) => {
      if (data) {
        try {
          setValue(JSON.parse(data));
        } catch {
          setValue(defaultValue);
        }
      }
      setLoading(false);
    });
  }, [key]);

  const save = useCallback(async (newValue: T) => {
    setValue(newValue);
    await AsyncStorage.setItem(key, JSON.stringify(newValue));
  }, [key]);

  return { value, save, loading };
}

// Contacts hook
export function useContacts() {
  const { value: contacts, save: setContacts, loading } = useLocalStorage<Contact[]>(CONTACTS_KEY, []);

  const addContact = useCallback(async (contact: Omit<Contact, "id" | "createdAt">) => {
    const newContact: Contact = {
      ...contact,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await setContacts([...contacts, newContact]);
    return newContact;
  }, [contacts, setContacts]);

  const removeContact = useCallback(async (id: string) => {
    await setContacts(contacts.filter((c) => c.id !== id));
  }, [contacts, setContacts]);

  return { contacts, addContact, removeContact, loading };
}

// Articles hook
export function useArticles() {
  const { value: articles, save: setArticles, loading } = useLocalStorage<Article[]>(ARTICLES_KEY, []);

  const addArticle = useCallback(async (article: Omit<Article, "id" | "sentAt">) => {
    const newArticle: Article = {
      ...article,
      id: Date.now().toString(),
      sentAt: new Date().toISOString(),
    };
    await setArticles([newArticle, ...articles]); // Most recent first
    return newArticle;
  }, [articles, setArticles]);

  return { articles, addArticle, loading };
}
