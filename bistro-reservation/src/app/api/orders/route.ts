import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { getPrismaClient } from '@/lib/prisma'

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

    // ⚠️ CRITICAL: サーバー側でメニュー情報を検証 & 合計金額を再計算
    const prisma = getPrismaClient()
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: {
          in: body.items.map((item) => item.id),
        },
        isPublished: true, // 公開済みの商品のみ許可
      },
    })

    // 送信されたすべての商品がメニューに存在するか確認
    if (menuItems.length !== body.items.length) {
      return NextResponse.json(
        { error: '無効な商品が含まれています' },
        { status: 400 }
      )
    }

    // サーバー側で合計金額を再計算
    const calculatedTotal = body.items.reduce((sum, clientItem) => {
      const menuItem = menuItems.find((m) => m.id === clientItem.id)
      if (!menuItem) {
        throw new Error(`Menu item ${clientItem.id} not found`)
      }

      // クライアント送信の数量が正数か確認
      if (!clientItem.quantity || clientItem.quantity <= 0 || !Number.isInteger(clientItem.quantity)) {
        throw new Error(`Invalid quantity for item ${clientItem.id}`)
      }

      // サーバー側の正しい価格で計算
      return sum + menuItem.price * clientItem.quantity
    }, 0)

    // クライアント送信の合計とサーバー計算の合計が一致するか確認
    if (calculatedTotal !== body.total) {
      console.warn(
        `Order total mismatch: client=${body.total}, calculated=${calculatedTotal}`,
        { items: body.items }
      )
      return NextResponse.json(
        {
          error: '注文合計金額が正確ではありません',
          details: '商品価格または数量が変更されている可能性があります',
        },
        { status: 400 }
      )
    }

    // 正しい価格情報でアイテムリストを再構築
    const validatedItems = body.items.map((clientItem) => {
      const menuItem = menuItems.find((m) => m.id === clientItem.id)!
      return {
        id: menuItem.id,
        name: menuItem.title,
        price: menuItem.price, // サーバー側の正しい価格
        quantity: clientItem.quantity,
      }
    })

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

    // 注文情報をデータベースに保存（検証済みのデータを使用）
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
          items: validatedItems, // クライアント送信のitemsではなく、検証済みのitemsを使用
          total: calculatedTotal, // クライアント送信のtotalではなく、サーバー計算のtotalを使用
          store_visit_date: body.paymentMethod === 'cash-store' ? body.storeVisitDate : null,
          status: 'unconfirmed',
        },
      ])
      .select()

    if (orderError) {
      console.error('Database error:', orderError)
      return NextResponse.json({ error: '注文の保存に失敗しました' }, { status: 500 })
    }

    // メール送信（検証済みのデータを使用）
    try {
      await sendOrderConfirmationEmail(
        body.customerInfo,
        validatedItems,
        calculatedTotal,
        body.paymentMethod,
        body.storeVisitDate,
        bankAccount
      )
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // メール送信失敗時も注文は保存されているため、エラーレスポンスは返さない
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
    
    // 検証エラーの場合は400を返す
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: 'Invalid order data: ' + error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
