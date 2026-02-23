import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Vercel からのリクエストか確認（セキュリティ）
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 本日より前の来店予定日を持つ注文を取得
    const today = new Date().toISOString().split('T')[0]

    const { data: ordersToCancel, error: selectError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('payment_method', 'cash-store')
      .lt('store_visit_date', today)

    if (selectError) {
      console.error('Failed to fetch orders:', selectError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!ordersToCancel || ordersToCancel.length === 0) {
      return NextResponse.json({
        message: 'No orders to cancel',
        cancelledCount: 0,
      })
    }

    // 来店日時が過ぎた注文を履歴に移動
    const historyInserts = ordersToCancel.map((order) => ({
      id: order.id,
      customer_name: order.customer_name,
      email: order.email,
      phone: order.phone,
      zip_code: order.zip_code,
      prefecture: order.prefecture,
      city: order.city,
      address: order.address,
      building: order.building,
      payment_method: order.payment_method,
      items: order.items,
      total: order.total,
      store_visit_date: order.store_visit_date,
      status: 'cancelled',
      created_at: order.created_at,
    }))

    const { error: insertError } = await supabaseServer
      .from('order_history')
      .insert(historyInserts)

    if (insertError) {
      console.error('Failed to insert into history:', insertError)
      return NextResponse.json({ error: 'Insert error' }, { status: 500 })
    }

    // 元の注文を削除
    const orderIds = ordersToCancel.map((o) => o.id)
    const { error: deleteError } = await supabaseServer
      .from('orders')
      .delete()
      .in('id', orderIds)

    if (deleteError) {
      console.error('Failed to delete orders:', deleteError)
      return NextResponse.json({ error: 'Delete error' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully cancelled expired store visit orders',
      cancelledCount: ordersToCancel.length,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
