'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calculator, TrendingUp, Calendar, DollarSign, FileText, BarChart3 } from 'lucide-react'

interface ContractInfo {
  siteName: string
  baseAmount: number
  startDate: string
  duration: number
}

interface PaymentYear {
  year: number
  startDate: string
  endDate: string
  baseAmount: number
  increaseType: 'percentage' | 'fixed' | 'none'
  increaseValue: number
  finalAmount: number
}

interface PaymentPattern {
  type: 'fixed' | 'prepayment' | 'variable' | 'fixed-amounts' | 'periodic' | 'custom'
  prepaymentYears?: number
  fixedPercentage?: number
  variablePercentages?: number[]
  fixedAmounts?: number[]
  periodicInterval?: number
  periodicAmount?: number
}

export default function TelecomContractManager() {
  const [contractInfo, setContractInfo] = useState<ContractInfo>({
    siteName: '',
    baseAmount: 0,
    startDate: '',
    duration: 1
  })

  const [paymentPattern, setPaymentPattern] = useState<PaymentPattern>({
    type: 'fixed'
  })

  const [paymentSchedule, setPaymentSchedule] = useState<PaymentYear[]>([])
  const [partialPeriodCalculation, setPartialPeriodCalculation] = useState<'proportional' | 'daily' | 'manual'>('proportional')
  const [manualPartialAmount, setManualPartialAmount] = useState(0)

  const calculatePaymentSchedule = () => {
    if (!contractInfo.siteName || contractInfo.baseAmount <= 0 || !contractInfo.startDate) {
      return
    }

    const schedule: PaymentYear[] = []
    const fullYears = Math.floor(contractInfo.duration)
    const hasPartialYear = contractInfo.duration % 1 !== 0
    const partialYearDuration = contractInfo.duration % 1

    for (let year = 1; year <= fullYears; year++) {
      const startDate = new Date(contractInfo.startDate)
      startDate.setFullYear(startDate.getFullYear() + year - 1)
      
      const endDate = new Date(startDate)
      endDate.setFullYear(endDate.getFullYear() + 1)
      endDate.setDate(endDate.getDate() - 1)

      let baseAmount = contractInfo.baseAmount
      let increaseType: 'percentage' | 'fixed' | 'none' = 'none'
      let increaseValue = 0
      let finalAmount = contractInfo.baseAmount

      if (paymentPattern.type === 'fixed' && paymentPattern.fixedPercentage) {
        if (year > 1) {
          increaseType = 'percentage'
          increaseValue = paymentPattern.fixedPercentage
          finalAmount = schedule[year - 2].finalAmount * (1 + paymentPattern.fixedPercentage / 100)
        }
      } else if (paymentPattern.type === 'prepayment' && paymentPattern.prepaymentYears && paymentPattern.fixedPercentage) {
        if (year > paymentPattern.prepaymentYears) {
          increaseType = 'percentage'
          increaseValue = paymentPattern.fixedPercentage
          finalAmount = schedule[year - 2].finalAmount * (1 + paymentPattern.fixedPercentage / 100)
        }
      } else if (paymentPattern.type === 'periodic' && paymentPattern.periodicInterval && paymentPattern.periodicAmount) {
        const isPaymentYear = year % paymentPattern.periodicInterval === 1 || (year === 1 && paymentPattern.periodicInterval === 1)
        if (isPaymentYear) {
          finalAmount = paymentPattern.periodicAmount
        } else {
          finalAmount = 0
        }
      } else if (paymentPattern.type === 'variable' && paymentPattern.variablePercentages) {
        if (year > 1 && paymentPattern.variablePercentages[year - 2]) {
          increaseType = 'percentage'
          increaseValue = paymentPattern.variablePercentages[year - 2]
          finalAmount = schedule[year - 2].finalAmount * (1 + paymentPattern.variablePercentages[year - 2] / 100)
        }
      } else if (paymentPattern.type === 'fixed-amounts' && paymentPattern.fixedAmounts) {
        finalAmount = paymentPattern.fixedAmounts[year - 1] || contractInfo.baseAmount
      }

      schedule.push({
        year,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        baseAmount,
        increaseType,
        increaseValue,
        finalAmount
      })
    }

    if (hasPartialYear) {
      const lastFullYear = schedule[schedule.length - 1]
      const startDate = new Date(lastFullYear.endDate)
      startDate.setDate(startDate.getDate() + 1)
      
      const endDate = new Date(contractInfo.startDate)
      endDate.setFullYear(endDate.getFullYear() + Math.floor(contractInfo.duration))
      endDate.setDate(endDate.getDate() - 1)

      let partialAmount = 0
      if (partialPeriodCalculation === 'proportional') {
        partialAmount = (lastFullYear?.finalAmount || contractInfo.baseAmount) * partialYearDuration
      } else if (partialPeriodCalculation === 'daily') {
        const daysInYear = 365
        const partialDays = Math.round(partialYearDuration * daysInYear)
        partialAmount = ((lastFullYear?.finalAmount || contractInfo.baseAmount) / daysInYear) * partialDays
      } else {
        partialAmount = manualPartialAmount
      }

      schedule.push({
        year: fullYears + 1,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        baseAmount: lastFullYear?.finalAmount || contractInfo.baseAmount,
        increaseType: 'none',
        increaseValue: 0,
        finalAmount: partialAmount
      })
    }

    setPaymentSchedule(schedule)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const getTotalAmount = () => {
    return paymentSchedule.reduce((sum, year) => sum + year.finalAmount, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' ریال'
  }

  useEffect(() => {
    calculatePaymentSchedule()
  }, [contractInfo, paymentPattern, partialPeriodCalculation, manualPartialAmount])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">مدیریت قراردادهای مخابراتی</h1>
          </div>
          <p className="text-gray-600">سیستم هوشمند محاسبه و مدیریت الگوهای پرداخت قراردادها</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  اطلاعات پایه قرارداد
                </CardTitle>
                <CardDescription>اطلاعات اصلی قرارداد را وارد کنید</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteName">نام سایت/قرارداد</Label>
                    <Input
                      id="siteName"
                      placeholder="مثال: سایت مخابراتی مرکز تهران"
                      value={contractInfo.siteName}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, siteName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseAmount">مبلغ پایه اولیه (سال اول)</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      placeholder="مثال: 100000000"
                      value={contractInfo.baseAmount || ''}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, baseAmount: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">تاریخ شروع قرارداد</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={contractInfo.startDate}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">مدت کل قرارداد (به سال)</Label>
                    <Input
                      id="duration"
                      type="number"
                      step="0.5"
                      placeholder="مثال: 5.5"
                      value={contractInfo.duration || ''}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, duration: Number(e.target.value) }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">امکان وارد کردن مقادیر اعشاری (مثال: 5.5 سال)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  الگوی پرداخت
                </CardTitle>
                <CardDescription>نوع ساختار افزایش پرداخت را انتخاب کنید</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={paymentPattern.type} onValueChange={(value) => setPaymentPattern(prev => ({ ...prev, type: value as PaymentPattern['type'] }))}>
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="fixed" className="text-xs">ثابت</TabsTrigger>
                    <TabsTrigger value="prepayment" className="text-xs">پیش‌پرداخت</TabsTrigger>
                    <TabsTrigger value="variable" className="text-xs">متغیر</TabsTrigger>
                    <TabsTrigger value="fixed-amounts" className="text-xs">مبلغ ثابت</TabsTrigger>
                    <TabsTrigger value="periodic" className="text-xs">دوره‌ای</TabsTrigger>
                    <TabsTrigger value="custom" className="text-xs">سفارشی</TabsTrigger>
                  </TabsList>

                  <TabsContent value="fixed" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fixedPercentage">درصد افزایش سالانه ثابت</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id="fixedPercentage"
                            type="number"
                            step="0.1"
                            placeholder="مثال: 5"
                            value={paymentPattern.fixedPercentage || ''}
                            onChange={(e) => setPaymentPattern(prev => ({ ...prev, fixedPercentage: Number(e.target.value) }))}
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">هر سال نسبت به سال قبل با این درصد افزایش می‌یابد</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="prepayment" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="prepaymentYears">تعداد سال‌های پیش‌پرداخت اولیه</Label>
                        <Input
                          id="prepaymentYears"
                          type="number"
                          placeholder="مثال: 2"
                          value={paymentPattern.prepaymentYears || ''}
                          onChange={(e) => setPaymentPattern(prev => ({ ...prev, prepaymentYears: Number(e.target.value) }))}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">در این سال‌ها مبلغ ثابت و بدون افزایش پرداخت می‌شود</p>
                      </div>
                      <div>
                        <Label htmlFor="prepaymentPercentage">درصد افزایش پس از دوره پیش‌پرداخت</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id="prepaymentPercentage"
                            type="number"
                            step="0.1"
                            placeholder="مثال: 5"
                            value={paymentPattern.fixedPercentage || ''}
                            onChange={(e) => setPaymentPattern(prev => ({ ...prev, fixedPercentage: Number(e.target.value) }))}
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="periodic" className="mt-4">
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>الگوی پرداخت دوره‌ای:</strong> برای قراردادهایی که در فواصل زمانی مشخص پرداخت دارند (مثلاً هر 2.5 سال یکبار)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="periodicInterval">فاصله زمانی پرداخت‌ها (به سال)</Label>
                        <Input
                          id="periodicInterval"
                          type="number"
                          step="0.5"
                          placeholder="مثال: 2.5"
                          value={paymentPattern.periodicInterval || ''}
                          onChange={(e) => setPaymentPattern(prev => ({ ...prev, periodicInterval: Number(e.target.value) }))}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">هر چند سال یکبار پرداخت انجام شود؟</p>
                      </div>
                      <div>
                        <Label htmlFor="periodicAmount">مبلغ هر دوره پرداخت</Label>
                        <Input
                          id="periodicAmount"
                          type="number"
                          placeholder="مثال: 500000000"
                          value={paymentPattern.periodicAmount || ''}
                          onChange={(e) => setPaymentPattern(prev => ({ ...prev, periodicAmount: Number(e.target.value) }))}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">مبلغی که در هر دوره پرداخت می‌شود</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="custom" className="mt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        <strong>الگوی سفارشی:</strong> در این حالت می‌توانید ترکیبی از تمام الگوهای بالا را پیاده‌سازی کنید.
                        این گزینه برای موارد پیچیده و خاص طراحی شده است.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  خلاصه پرداخت‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">تعداد سال‌ها:</span>
                    <Badge variant="secondary">{paymentSchedule.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">مبلغ کل قرارداد:</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(getTotalAmount())}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">نمودار پرداخت سالانه</h4>
                    <div className="space-y-2">
                      {paymentSchedule.slice(0, 5).map((year) => (
                        <div key={year.year} className="flex items-center gap-2">
                          <span className="text-xs w-8">س{year.year}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full flex items-center justify-end pr-2"
                              style={{
                                width: `${(year.finalAmount / Math.max(...paymentSchedule.map(y => y.finalAmount))) * 100}%`
                              }}
                            >
                              <span className="text-xs text-white font-medium">
                                {Math.round((year.finalAmount / 1000000))}M
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {contractInfo.duration % 1 !== 0 && (
              <Card className="shadow-sm border-0">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    محاسبه دوره خورده‌ای
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <RadioGroup value={partialPeriodCalculation} onValueChange={(value) => setPartialPeriodCalculation(value as any)}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="proportional" id="proportional" />
                        <Label htmlFor="proportional" className="text-sm">
                          تناسبی از مبلغ سال آخر
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily" className="text-sm">
                          بر اساس نرخ روزانه
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="text-sm">
                          وارد کردن مبلغ به صورت دستی
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  {partialPeriodCalculation === 'manual' && (
                    <div className="mt-4">
                      <Label htmlFor="manualAmount">مبلغ دوره خورده‌ای</Label>
                      <Input
                        id="manualAmount"
                        type="number"
                        placeholder="مبلغ را وارد کنید"
                        value={manualPartialAmount || ''}
                        onChange={(e) => setManualPartialAmount(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card className="shadow-sm border-0 mt-6">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              جدول پیش‌نمایش پرداخت‌ها
            </CardTitle>
            <CardDescription>جزئیات کامل محاسبات به صورت زنده</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>سال</TableHead>
                    <TableHead>دوره زمانی</TableHead>
                    <TableHead>مبلغ پایه</TableHead>
                    <TableHead>نوع افزایش</TableHead>
                    <TableHead>مبلغ نهایی</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSchedule.map((year) => (
                    <TableRow key={year.year}>
                      <TableCell>
                        <Badge variant={year.year > Math.floor(contractInfo.duration) ? "destructive" : "default"}>
                          {year.year > Math.floor(contractInfo.duration) ? 'خورده‌ای' : `سال ${year.year}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {year.startDate} - {year.endDate}
                      </TableCell>
                      <TableCell>{formatCurrency(year.baseAmount)}</TableCell>
                      <TableCell>
                        {year.increaseType === 'percentage' && (
                          <Badge variant="secondary">+{year.increaseValue}%</Badge>
                        )}
                        {year.increaseType === 'none' && year.finalAmount > 0 && (
                          <Badge variant="outline">بدون افزایش</Badge>
                        )}
                        {year.finalAmount === 0 && (
                          <Badge variant="destructive">بدون پرداخت</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(year.finalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell colSpan={4} className="text-right">
                      جمع کل:
                    </TableCell>
                    <TableCell className="text-primary">
                      {formatCurrency(getTotalAmount())}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
