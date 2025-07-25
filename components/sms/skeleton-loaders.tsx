import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Phone, Clock } from "lucide-react"

export const TemplateSelectionSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <MessageSquare className="w-5 h-5 mr-2" />
        短信模板选择
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-10" />
      </div>
      <Skeleton className="h-16 w-full" />
    </CardContent>
  </Card>
)

export const PhoneNumberSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Phone className="w-5 h-5 mr-2" />
        手机号码
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2 items-end">
          <div className="min-w-0 flex-shrink-0">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

export const StatusMonitoringSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          实时状态
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export const LoadingPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-4">
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel Skeleton */}
        <div className="space-y-6">
          <TemplateSelectionSkeleton />
          <PhoneNumberSkeleton />
          
          {/* Template Parameters Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Send Buttons Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Right Panel Skeleton */}
        <div className="space-y-6">
          <StatusMonitoringSkeleton />
          
          {/* Instructions Skeleton */}
          <div className="border rounded-lg p-4">
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)