from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import base64
from io import BytesIO

try:
    import seaborn as sns
    import matplotlib.pyplot as plt
except ImportError as e:
    print(f"Dependency error: {e}")
    sns = None
    plt = None

app = Flask(__name__)
CORS(app)

@app.route('/generate-graphs', methods=['POST'])
def generate_graphs():
    print("Received request at /generate-graphs")
    try:
        if not request.is_json:
            print("Error: Request is not JSON")
            return jsonify({'status': 'error', 'message': 'Request must be JSON'}), 400

        data = request.get_json()
        records = data.get('records', [])
        print(f"Records received: {len(records)}")
        if not records:
            print("No records provided")
            return jsonify({
                'status': 'success',
                'bar_chart': '<p>No data available</p>',
                'line_chart': '<p>No data available</p>',
                'summary': {
                    'total_records': 0,
                    'avg_wind_speed': 0,
                    'total_rainfall': 0,
                    'avg_visibility': 0
                }
            })

        df = pd.DataFrame(records, columns=['Date', 'Time', 'Wind Speed', 'Rainfall', 'Visibility'])
        print("DataFrame created:", df.head().to_string())
        df['Wind Speed'] = pd.to_numeric(df['Wind Speed'], errors='coerce').fillna(0)
        df['Rainfall'] = pd.to_numeric(df['Rainfall'], errors='coerce').fillna(0)
        df['Visibility'] = pd.to_numeric(df['Visibility'], errors='coerce').fillna(0)
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce', dayfirst=True)

        if df['Date'].isna().all():
            print("Error: All dates are invalid")
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format in data'
            }), 400

        total_records = len(df)
        avg_wind_speed = df['Wind Speed'].mean() if total_records > 0 else 0
        total_rainfall = df['Rainfall'].sum() if total_records > 0 else 0
        avg_visibility = df['Visibility'].mean() if total_records > 0 else 0

        if sns is None or plt is None:
            print("Error: Seaborn or Matplotlib not installed")
            return jsonify({
                'status': 'error',
                'message': 'Seaborn or Matplotlib not installed',
                'summary': {
                    'total_records': total_records,
                    'avg_wind_speed': round(avg_wind_speed, 2),
                    'total_rainfall': round(total_rainfall, 2),
                    'avg_visibility': round(avg_visibility, 2)
                }
            }), 500

        # Bar chart: Average Wind Speed by Date
        try:
            date_summary = df.groupby(df['Date'].dt.strftime('%d/%m/%y'))['Wind Speed'].mean().reset_index()
            print("Date summary:", date_summary.to_string())
            if date_summary.empty:
                print("Error: Date summary is empty")
                bar_html = '<p>No date data available</p>'
            else:
                plt.figure(figsize=(6, 4))
                sns.set_style("whitegrid")
                sns.barplot(data=date_summary, x='Date', y='Wind Speed', color='#3498DB')
                plt.title('Average Wind Speed by Date')
                plt.ylabel('Wind Speed (km/h)')
                plt.xlabel('Date')
                # Reduce tick frequency for readability
                max_ticks = 10
                if len(date_summary) > max_ticks:
                    step = len(date_summary) // max_ticks + 1
                    plt.xticks(range(0, len(date_summary), step), date_summary['Date'][::step], rotation=45, ha='right')
                else:
                    plt.xticks(rotation=45, ha='right')
                plt.tight_layout()

                bar_buffer = BytesIO()
                plt.savefig(bar_buffer, format='png', bbox_inches='tight')
                bar_buffer.seek(0)
                bar_image = base64.b64encode(bar_buffer.getvalue()).decode('utf-8')
                bar_html = f'<img src="data:image/png;base64,{bar_image}" alt="Average Wind Speed by Date" style="width:100%;max-width:600px;">'
                plt.close()
                print("Bar chart image generated, base64 length:", len(bar_image))
        except Exception as e:
            print(f"Error generating bar chart: {str(e)}")
            bar_html = '<p>Error generating bar chart</p>'

        # Line chart: Average Visibility by Date
        try:
            df['DateStr'] = df['Date'].dt.strftime('%d/%m/%y')
            trend_summary = df.groupby('DateStr')['Visibility'].mean().reset_index()
            print("Trend summary:", trend_summary.to_string())
            if trend_summary.empty:
                print("Error: Trend summary is empty")
                line_html = '<p>No visibility data available</p>'
            else:
                plt.figure(figsize=(6, 4))
                sns.set_style("whitegrid")
                sns.lineplot(data=trend_summary, x='DateStr', y='Visibility', color='#F39C12', marker='o')
                plt.title('Average Visibility by Date')
                plt.ylabel('Visibility (km)')
                plt.xlabel('Date')
                # Reduce tick frequency for readability
                max_ticks = 10
                if len(trend_summary) > max_ticks:
                    step = len(trend_summary) // max_ticks + 1
                    plt.xticks(range(0, len(trend_summary), step), trend_summary['DateStr'][::step], rotation=45, ha='right')
                else:
                    plt.xticks(rotation=45, ha='right')
                plt.tight_layout()

                line_buffer = BytesIO()
                plt.savefig(line_buffer, format='png', bbox_inches='tight')
                line_buffer.seek(0)
                line_image = base64.b64encode(line_buffer.getvalue()).decode('utf-8')
                line_html = f'<img src="data:image/png;base64,{line_image}" alt="Average Visibility by Date" style="width:100%;max-width:600px;">'
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
                'total_records': total_records,
                'avg_wind_speed': round(avg_wind_speed, 2),
                'total_rainfall': round(total_rainfall, 2),
                'avg_visibility': round(avg_visibility, 2)
            }
        })

    except Exception as e:
        print(f"Error in generate_graphs: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask app on port 5000...")
    app.run(debug=True, port=5000, host='0.0.0.0')