import { create } from "zustand";
import type {
  Document,
  Tag,
  SearchResponse,
  DocumentFilter,
  AdvancedSearchRequest,
  DocumentProcessingJob,
  KnowledgeStats,
} from "../services/knowledge";
import {
  getDocuments,
  getTags,
  searchDocuments,
  advancedSearch,
  getSearchHistory,
  getProcessingJobs,
  getKnowledgeStats,
  uploadDocumentWithProgress,
  bulkUploadWithProgress,
} from "../services/knowledge";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  document?: Document;
}

interface KnowledgeState {
  // Documents
  documents: Document[];
  documentsLoading: boolean;
  documentsError: string | null;

  // Tags
  tags: Tag[];
  tagsLoading: boolean;
  tagsError: string | null;
  documentTypes: string[];

  // Search
  searchResults: SearchResponse | null;
  searchLoading: boolean;
  searchError: string | null;
  searchHistory: SearchResponse[];

  // Filters
  currentFilters: DocumentFilter;
  appliedFilters: DocumentFilter;

  // Upload
  uploadQueue: UploadItem[];
  uploadProgress: number;

  // Processing Jobs
  processingJobs: DocumentProcessingJob[];
  jobsLoading: boolean;

  // Statistics
  stats: KnowledgeStats | null;
  statsLoading: boolean;

  // Actions
  fetchDocuments: (filters?: DocumentFilter) => Promise<void>;
  fetchTags: () => Promise<void>;
  search: (query: string, searchType?: string) => Promise<void>;
  advancedSearch: (request: AdvancedSearchRequest) => Promise<void>;
  fetchSearchHistory: () => Promise<void>;
  fetchProcessingJobs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  getTags: () => Promise<void>;
  getDocuments: () => Promise<void>;

  // Upload actions
  addToUploadQueue: (files: File[]) => void;
  removeFromUploadQueue: (id: string) => void;
  uploadFile: (item: UploadItem) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
  clearUploadQueue: () => void;

  // Filter actions
  setFilters: (filters: DocumentFilter) => void;
  applyFilters: () => Promise<void>;
  clearFilters: () => void;

  // Utility actions
  refreshDocuments: () => Promise<void>;
  refreshTags: () => Promise<void>;
  clearSearchResults: () => void;
  clearErrors: () => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  // Initial state
  documents: [],
  documentsLoading: false,
  documentsError: null,

  tags: [],
  documentTypes: [],
  tagsLoading: false,
  tagsError: null,

  searchResults: null,
  searchLoading: false,
  searchError: null,
  searchHistory: [],

  currentFilters: {},
  appliedFilters: {},

  uploadQueue: [],
  uploadProgress: 0,

  processingJobs: [],
  jobsLoading: false,

  stats: null,
  statsLoading: false,

  // Document actions
  fetchDocuments: async (filters?: DocumentFilter) => {
    set({ documentsLoading: true, documentsError: null });
    try {
      const documents = await getDocuments(filters);
      set({ documents, documentsLoading: false });
    } catch (error) {
      set({
        documentsError:
          error instanceof Error ? error.message : "Failed to fetch documents",
        documentsLoading: false,
      });
    }
  },

  fetchTags: async () => {
    set({ tagsLoading: true, tagsError: null });
    try {
      const tags = await getTags();
      set({ tags, tagsLoading: false });
    } catch (error) {
      set({
        tagsError:
          error instanceof Error ? error.message : "Failed to fetch tags",
        tagsLoading: false,
      });
    }
  },

  // Search actions
  search: async (query: string, searchType: string = "semantic") => {
    set({ searchLoading: true, searchError: null });
    try {
      const results = await searchDocuments(query, searchType);
      set({ searchResults: results, searchLoading: false });
    } catch (error) {
      set({
        searchError: error instanceof Error ? error.message : "Search failed",
        searchLoading: false,
      });
    }
  },

  advancedSearch: async (request: AdvancedSearchRequest) => {
    set({ searchLoading: true, searchError: null });
    try {
      const results = await advancedSearch(request);
      set({ searchResults: results, searchLoading: false });
    } catch (error) {
      set({
        searchError:
          error instanceof Error ? error.message : "Advanced search failed",
        searchLoading: false,
      });
    }
  },

  fetchSearchHistory: async () => {
    try {
      const history = await getSearchHistory();
      set({ searchHistory: history });
    } catch (error) {
      console.error("Failed to fetch search history:", error);
    }
  },

  fetchProcessingJobs: async () => {
    set({ jobsLoading: true });
    try {
      const jobs = await getProcessingJobs();
      set({ processingJobs: jobs, jobsLoading: false });
    } catch (error) {
      console.error("Failed to fetch processing jobs:", error);
      set({ jobsLoading: false });
    }
  },

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await getKnowledgeStats();
      set({ stats, statsLoading: false });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      set({ statsLoading: false });
    }
  },

  // Upload actions
  addToUploadQueue: (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: "pending",
    }));

    set((state) => ({
      uploadQueue: [...state.uploadQueue, ...newItems],
    }));
  },

  removeFromUploadQueue: (id: string) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((item) => item.id !== id),
    }));
  },

  uploadFile: async (item: UploadItem) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.map((queueItem) =>
        queueItem.id === item.id
          ? { ...queueItem, status: "uploading" }
          : queueItem,
      ),
    }));

    try {
      const document = await uploadDocumentWithProgress(
        item.file,
        undefined,
        (progress) => {
          set((state) => ({
            uploadQueue: state.uploadQueue.map((queueItem) =>
              queueItem.id === item.id ? { ...queueItem, progress } : queueItem,
            ),
          }));
        },
      );

      set((state) => ({
        uploadQueue: state.uploadQueue.map((queueItem) =>
          queueItem.id === item.id
            ? { ...queueItem, status: "completed", document }
            : queueItem,
        ),
        documents: [document, ...state.documents],
      }));
    } catch (error) {
      set((state) => ({
        uploadQueue: state.uploadQueue.map((queueItem) =>
          queueItem.id === item.id
            ? {
                ...queueItem,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : queueItem,
        ),
      }));
    }
  },

  uploadFiles: async (files: File[]) => {
    const { addToUploadQueue, uploadQueue } = get();
    addToUploadQueue(files);

    const newItems = uploadQueue.filter((item) =>
      files.some((file) => file === item.file),
    );

    for (const item of newItems) {
      await get().uploadFile(item);
    }
  },

  clearUploadQueue: () => {
    set({ uploadQueue: [] });
  },

  // Filter actions
  setFilters: (filters: DocumentFilter) => {
    set({ currentFilters: filters });
  },

  applyFilters: async () => {
    const { currentFilters, fetchDocuments } = get();
    set({ appliedFilters: currentFilters });
    await fetchDocuments(currentFilters);
  },

  clearFilters: () => {
    set({ currentFilters: {}, appliedFilters: {} });
    get().fetchDocuments();
  },

  // Utility actions
  refreshDocuments: async () => {
    const { appliedFilters, fetchDocuments } = get();
    await fetchDocuments(appliedFilters);
  },

  refreshTags: async () => {
    await get().fetchTags();
  },

  clearSearchResults: () => {
    set({ searchResults: null, searchError: null });
  },

  clearErrors: () => {
    set({
      documentsError: null,
      tagsError: null,
      searchError: null,
    });
  },

  getTags: async () => {
    // Placeholder: fetch tags and set state
    try {
      const tags = await getTags();
      set({ tags });
    } catch (error) {
      set({ tags: [] });
    }
  },
  getDocuments: async () => {
    // Placeholder: fetch documents and set state
    try {
      const documents = await getDocuments();
      set({ documents });
    } catch (error) {
      set({ documents: [] });
    }
  },
}));

// Selectors for better performance
export const useDocuments = () =>
  useKnowledgeStore((state) => ({
    documents: state.documents,
    loading: state.documentsLoading,
    error: state.documentsError,
  }));

export const useTags = () =>
  useKnowledgeStore((state) => ({
    tags: state.tags,
    loading: state.tagsLoading,
    error: state.tagsError,
  }));

export const useSearch = () =>
  useKnowledgeStore((state) => ({
    results: state.searchResults,
    loading: state.searchLoading,
    error: state.searchError,
    history: state.searchHistory,
  }));

export const useUpload = () =>
  useKnowledgeStore((state) => ({
    queue: state.uploadQueue,
    progress: state.uploadProgress,
  }));

export const useFilters = () =>
  useKnowledgeStore((state) => ({
    current: state.currentFilters,
    applied: state.appliedFilters,
  }));

export const useStats = () =>
  useKnowledgeStore((state) => ({
    stats: state.stats,
    loading: state.statsLoading,
    fetchStats: state.fetchStats,
  }));
