from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import base64
from io import BytesIO

# Conditional imports to handle missing dependencies
try:
    import seaborn as sns
    import matplotlib.pyplot as plt
except ImportError as e:
    print(f"Dependency error: {e}")
    sns = None
    plt = None

app = Flask(__name__)
CORS(app)  # Allow all origins for development

@app.route('/generate-graphs', methods=['POST'])
def generate_graphs():
    print("Received request at /generate-graphs")
    try:
        if not request.is_json:
            print("Error: Request is not JSON")
            return jsonify({'status': 'error', 'message': 'Request must be JSON'}), 400

        data = request.get_json()
        orders = data.get('orders', [])
        print(f"Orders received: {len(orders)}")
        if not orders:
            print("No orders provided")
            return jsonify({
                'status': 'success',
                'bar_chart': '<p>No data available</p>',
                'line_chart': '<p>No data available</p>',
                'summary': {
                    'total_orders': 0,
                    'pending_orders': 0,
                    'delivered_orders': 0,
                    'avg_amount': 0
                }
            })

        df = pd.DataFrame(orders, columns=['Date', 'ID', 'Drone ID', 'Status', 'Amount'])
        print("DataFrame created:", df.head().to_string())
        df['Amount'] = df['Amount'].astype(str).str.replace(r'[^\d.]', '', regex=True).replace('', '0').astype(float)
        df['Status'] = df['Status'].fillna('Unknown').astype(str).str.strip()
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')

        if df['Date'].isna().all():
            print("Error: All dates are invalid")
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format in data'
            }), 400

        total_orders = len(df)
        pending_orders = len(df[df['Status'].str.lower() == 'pending'])
        delivered_orders = len(df[df['Status'].str.lower() == 'delivered'])
        avg_amount = df['Amount'].mean() if total_orders > 0 else 0

        # Check if plotting dependencies are available
        if sns is None or plt is None:
            print("Error: Seaborn or Matplotlib not installed")
            return jsonify({
                'status': 'error',
                'message': 'Seaborn or Matplotlib not installed',
                'summary': {
                    'total_orders': total_orders,
                    'pending_orders': pending_orders,
                    'delivered_orders': delivered_orders,
                    'avg_amount': round(avg_amount, 2)
                }
            }), 500

        # Bar chart: Revenue by Status
        try:
            status_summary = df.groupby('Status')['Amount'].sum().reset_index()
            print("Status summary:", status_summary.to_string())
            print("Status unique values:", df['Status'].unique().tolist())
            print("Amount NaN count:", df['Amount'].isna().sum())
            print("Status summary info:", status_summary.info())
            
            if status_summary.empty:
                print("Error: Status summary is empty")
                bar_html = '<p>No status data available</p>'
            elif status_summary['Amount'].isna().any() or (status_summary['Amount'] == 0).all():
                print("Error: Invalid or zero amounts in status summary")
                bar_html = '<p>No valid amount data for bar chart</p>'
            elif status_summary['Status'].str.strip().eq('').any():
                print("Error: Empty status values detected")
                bar_html = '<p>Invalid status values</p>'
            else:
                plt.figure(figsize=(6, 4))
                sns.set_style("whitegrid")
                # Simplified barplot with single color to avoid palette issues
                sns.barplot(data=status_summary, x='Status', y='Amount', color='#FFCE56')
                plt.title('Revenue by Status')
                plt.ylabel('Revenue ($)')
                plt.xlabel('Status')
                plt.tight_layout()

                bar_buffer = BytesIO()
                plt.savefig(bar_buffer, format='png', bbox_inches='tight')
                bar_buffer.seek(0)
                bar_image = base64.b64encode(bar_buffer.getvalue()).decode('utf-8')
                bar_html = f'<img src="data:image/png;base64,{bar_image}" alt="Revenue by Status" style="width:100%;max-width:600px;">'
                plt.close()
                print("Bar chart image generated, base64 length:", len(bar_image))
        except Exception as e:
            print(f"Error generating bar chart: {str(e)}")
            bar_html = '<p>Error generating bar chart</p>'

        # Line chart: Revenue Over Time
        try:
            df['DateStr'] = df['Date'].dt.strftime('%d/%m/%y')  # Shorten date format to DD/MM/YY
            trend_summary = df.groupby('DateStr')['Amount'].sum().reset_index()
            trend_summary = trend_summary.sort_values(by='DateStr', key=lambda x: pd.to_datetime(x, format='%d/%m/%y'))

            plt.figure(figsize=(6, 4))
            sns.set_style("whitegrid")
            sns.lineplot(data=trend_summary, x='DateStr', y='Amount', color='#4CAF50', marker='o')
            plt.title('Revenue Over Time')
            plt.ylabel('Revenue ($)')
            plt.xlabel('Date')

            # Adjust x-axis ticks to reduce congestion
            plt.xticks(rotation=45, ha='right')  # Rotate labels for better readability
            max_ticks = 10  # Maximum number of ticks to display
            if len(trend_summary) > max_ticks:
                step = len(trend_summary) // max_ticks + 1
                plt.gca().set_xticks(trend_summary['DateStr'][::step])  # Show every nth label

            plt.tight_layout()

            line_buffer = BytesIO()
            plt.savefig(line_buffer, format='png', bbox_inches='tight')
            line_buffer.seek(0)
            line_image = base64.b64encode(line_buffer.getvalue()).decode('utf-8')
            line_html = f'<img src="data:image/png;base64,{line_image}" alt="Revenue Over Time" style="width:100%;max-width:600px;">'
            plt.close()
            print("Line chart image generated, base64 length:", len(line_image))
        except Exception as e:
            print(f"Error generating line chart: {e}")
            line_html = '<p>Error generating line chart</p>'

        return jsonify({
            'status': 'success',
            'bar_chart': bar_html,
            'line_chart': line_html,
            'summary': {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'delivered_orders': delivered_orders,
                'avg_amount': round(avg_amount, 2)
            }
        })

    except Exception as e:
        print(f"Error in generate_graphs: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask app on port 5000...")
    app.run(debug=True, port=5000, host='0.0.0.0')