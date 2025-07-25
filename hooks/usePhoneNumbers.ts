import { useState, useCallback, useEffect } from "react"

export interface PhoneNumberState {
  phoneNumber: string
  selectedCarrier: string
  availableCarriers: string[]
  phoneSearchTerm: string
  phoneNumbers: any[]
  phoneNumbersLoading: boolean
  phonePagination: {
    total: number
    totalPages: number
    currentPage: number
    pageSize: number
    hasNext: boolean
    hasPrev: boolean
  }
  inputSuggestions: any[]
  showInputSuggestions: boolean
  activeInputSuggestionIndex: number
  isLoadingInputSuggestions: boolean
  isLoadingCarriers: boolean
}

export interface PhoneNumberActions {
  setPhoneNumber: (phoneNumber: string) => void
  setSelectedCarrier: (carrier: string) => void
  setAvailableCarriers: (carriers: string[]) => void
  setPhoneSearchTerm: (term: string) => void
  setPhoneNumbers: (numbers: any[]) => void
  setPhoneNumbersLoading: (loading: boolean) => void
  setPhonePagination: (pagination: any) => void
  setInputSuggestions: (suggestions: any[]) => void
  setShowInputSuggestions: (show: boolean) => void
  setActiveInputSuggestionIndex: (index: number) => void
  setIsLoadingInputSuggestions: (loading: boolean) => void
  setIsLoadingCarriers: (loading: boolean) => void
  loadCarriers: () => Promise<void>
  searchPhoneNumbers: (searchTerm?: string, carrier?: string, page?: number) => Promise<void>
  handleCarrierSelect: (carrier: string) => void
  handlePhoneSearch: (searchTerm: string) => void
  handlePageChange: (page: number) => void
  searchInputSuggestions: (input: string) => Promise<void>
  selectInputSuggestion: (suggestion: any) => void
  handleInputKeyDown: (e: React.KeyboardEvent) => void
  handlePhoneNumberChange: (value: string) => void
}

export const usePhoneNumbers = (): PhoneNumberState & PhoneNumberActions => {
  // Phone number and sending
  const [phoneNumber, setPhoneNumber] = useState("")
  
  // Carrier selection states
  const [selectedCarrier, setSelectedCarrier] = useState("")
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([])
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(true)
  
  // Phone number search and pagination states
  const [phoneSearchTerm, setPhoneSearchTerm] = useState("")
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(false)
  const [phonePagination, setPhonePagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 20,
    hasNext: false,
    hasPrev: false
  })

  // Phone number input suggestion states
  const [inputSuggestions, setInputSuggestions] = useState<any[]>([])
  const [showInputSuggestions, setShowInputSuggestions] = useState(false)
  const [activeInputSuggestionIndex, setActiveInputSuggestionIndex] = useState(-1)
  const [isLoadingInputSuggestions, setIsLoadingInputSuggestions] = useState(false)

  // Load carriers
  const loadCarriers = useCallback(async () => {
    try {
      setIsLoadingCarriers(true)
      const response = await fetch('/api/phone-numbers/carriers')
      if (response.ok) {
        const data = await response.json()
        setAvailableCarriers(data.data || [])
      }
    } catch (error) {
      console.error("Failed to load carriers:", error)
    } finally {
      setIsLoadingCarriers(false)
    }
  }, [])

  // Search phone numbers with server-side search and pagination
  const searchPhoneNumbers = useCallback(async (searchTerm: string = '', carrier: string = '', page: number = 1) => {
    try {
      setPhoneNumbersLoading(true)
      const offset = (page - 1) * 20
      
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString()
      })
      
      if (searchTerm.trim()) {
        params.append('q', searchTerm.trim())
      }
      
      if (carrier && carrier !== 'all') {
        params.append('carrier', carrier)
      }
      
      const response = await fetch(`/api/phone-numbers/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.data || [])
        setPhonePagination(data.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          pageSize: 20,
          hasNext: false,
          hasPrev: false
        })
      }
    } catch (error) {
      console.error("Failed to search phone numbers:", error)
      setPhoneNumbers([])
    } finally {
      setPhoneNumbersLoading(false)
    }
  }, [])

  // Handle carrier selection and trigger phone number search
  const handleCarrierSelect = useCallback((carrier: string) => {
    setSelectedCarrier(carrier)
    setPhoneNumber("") // Clear selected phone number when carrier changes
    searchPhoneNumbers(phoneSearchTerm, carrier, 1) // Reset to first page
  }, [phoneSearchTerm, searchPhoneNumbers])

  // Handle phone search
  const handlePhoneSearch = useCallback((searchTerm: string) => {
    setPhoneSearchTerm(searchTerm)
    setPhoneNumber("") // Clear selected phone number when search changes
    searchPhoneNumbers(searchTerm, selectedCarrier, 1) // Reset to first page
  }, [selectedCarrier, searchPhoneNumbers])

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    searchPhoneNumbers(phoneSearchTerm, selectedCarrier, page)
  }, [phoneSearchTerm, selectedCarrier, searchPhoneNumbers])

  // Search phone number suggestions based on user input
  const searchInputSuggestions = useCallback(async (input: string) => {
    if (input.length < 3 || input.length === 11) {
      setInputSuggestions([])
      setShowInputSuggestions(false)
      return
    }

    setIsLoadingInputSuggestions(true)
    try {
      const response = await fetch(`/api/phone-numbers/search?q=${encodeURIComponent(input)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setInputSuggestions(data.data || [])
        setShowInputSuggestions((data.data || []).length > 0)
        setActiveInputSuggestionIndex(-1)
      }
    } catch (error) {
      console.error('Failed to search input suggestions:', error)
      setInputSuggestions([])
      setShowInputSuggestions(false)
    } finally {
      setIsLoadingInputSuggestions(false)
    }
  }, [])

  // Select suggestion from input dropdown
  const selectInputSuggestion = useCallback((suggestion: any) => {
    setPhoneNumber(suggestion.number)
    setShowInputSuggestions(false)
    setActiveInputSuggestionIndex(-1)
  }, [])

  // Handle keyboard navigation for input suggestions
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showInputSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveInputSuggestionIndex(prev => 
          prev < inputSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveInputSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeInputSuggestionIndex >= 0) {
          selectInputSuggestion(inputSuggestions[activeInputSuggestionIndex])
        }
        break
      case 'Escape':
        setShowInputSuggestions(false)
        setActiveInputSuggestionIndex(-1)
        break
    }
  }, [showInputSuggestions, inputSuggestions, activeInputSuggestionIndex, selectInputSuggestion])

  // 处理手机号码输入和自动推荐
  const handlePhoneNumberChange = useCallback((value: string) => {
    setPhoneNumber(value)
  }, [])

  // 使用 useEffect 来处理延迟搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (phoneNumber.length >= 3 && phoneNumber.length !== 11) {
        searchInputSuggestions(phoneNumber)
      } else {
        setInputSuggestions([])
        setShowInputSuggestions(false)
      }
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [phoneNumber, searchInputSuggestions])

  // 当选择运营商时，自动触发搜索
  useEffect(() => {
    if (selectedCarrier) {
      searchPhoneNumbers(phoneSearchTerm, selectedCarrier, 1)
    }
  }, [selectedCarrier, phoneSearchTerm, searchPhoneNumbers])

  return {
    // State
    phoneNumber,
    selectedCarrier,
    availableCarriers,
    phoneSearchTerm,
    phoneNumbers,
    phoneNumbersLoading,
    phonePagination,
    inputSuggestions,
    showInputSuggestions,
    activeInputSuggestionIndex,
    isLoadingInputSuggestions,
    isLoadingCarriers,
    
    // Actions
    setPhoneNumber,
    setSelectedCarrier,
    setAvailableCarriers,
    setPhoneSearchTerm,
    setPhoneNumbers,
    setPhoneNumbersLoading,
    setPhonePagination,
    setInputSuggestions,
    setShowInputSuggestions,
    setActiveInputSuggestionIndex,
    setIsLoadingInputSuggestions,
    setIsLoadingCarriers,
    loadCarriers,
    searchPhoneNumbers,
    handleCarrierSelect,
    handlePhoneSearch,
    handlePageChange,
    searchInputSuggestions,
    selectInputSuggestion,
    handleInputKeyDown,
    handlePhoneNumberChange,
  }
}