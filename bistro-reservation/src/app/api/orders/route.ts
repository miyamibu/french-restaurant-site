import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendOrderConfirmationEmail } from '@/lib/email'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
  zipCode: string
  prefecture: string
  city: string
  address: string
  building?: string
}

interface OrderRequest {
  items: OrderItem[]
  customerInfo: CustomerInfo
  paymentMethod: 'bank-transfer' | 'cash-store'
  total: number
  storeVisitDate?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: OrderRequest = await req.json()

    // バリデーション
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: '商品がありません' }, { status: 400 })
    }

    if (!body.customerInfo || !body.paymentMethod) {
      return NextResponse.json({ error: '必須情報が不足しています' }, { status: 400 })
    }

    if (body.paymentMethod === 'cash-store' && !body.storeVisitDate) {
      return NextResponse.json({ error: '来店日が指定されていません' }, { status: 400 })
    }

    // 銀行口座情報を取得（銀行振込の場合）
    let bankAccount = null
    if (body.paymentMethod === 'bank-transfer') {
      const { data, error } = await supabaseServer.from('bank_account').select('*').limit(1)
      if (error) {
        console.error('Failed to fetch bank account:', error)
      } else {
        bankAccount = data?.[0]
      }
    }

    // 注文情報をデータベースに保存
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .insert([
        {
          customer_name: body.customerInfo.name,
          email: body.customerInfo.email,
          phone: body.customerInfo.phone,
          zip_code: body.customerInfo.zipCode,
          prefecture: body.customerInfo.prefecture,
          city: body.customerInfo.city,
          address: body.customerInfo.address,
          building: body.customerInfo.building || null,
          payment_method: body.paymentMethod,
          items: body.items,
          total: body.total,
          store_visit_date: body.paymentMethod === 'cash-store' ? body.storeVisitDate : null,
          status: 'unconfirmed',
        },
      ])
      .select()

    if (orderError) {
      console.error('Database error:', orderError)
      return NextResponse.json({ error: '注文の保存に失敗しました' }, { status: 500 })
    }

    // メール送信
    try {
      await sendOrderConfirmationEmail(
        body.customerInfo,
        body.items,
        body.total,
        body.paymentMethod,
        body.storeVisitDate,
        bankAccount
      )
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // メール送送信失敗時も注文は保存されているため、エラーレスポンスは返さない
    }

    return NextResponse.json(
      {
        message: 'Order created successfully',
        order: order?.[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
