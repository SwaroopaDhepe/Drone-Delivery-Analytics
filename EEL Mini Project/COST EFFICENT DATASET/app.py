from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import base64
from io import BytesIO
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

try:
    import seaborn as sns
    import matplotlib.pyplot as plt
except ImportError as e:
    logger.error(f"Dependency error: {e}")
    sns = None
    plt = None

app = Flask(__name__)
CORS(app)

@app.route('/generate-graphs', methods=['POST'])
def generate_graphs():
    logger.info("Received request at /generate-graphs")
    try:
        if not request.is_json:
            logger.error("Request is not JSON")
            return jsonify({'status': 'error', 'message': 'Request must be JSON', 'bar_chart': '<p>Error: Invalid request</p>', 'line_chart': '<p>Error: Invalid request</p>'}), 400

        data = request.get_json()
        logger.debug(f"Request data: {data}")
        deliveries = data.get('deliveries', [])
        logger.info(f"Deliveries received: {len(deliveries)}")

        if not deliveries:
            logger.info("No deliveries provided")
            return jsonify({
                'status': 'success',
                'bar_chart': '<p>No data available</p>',
                'line_chart': '<p>No data available</p>',
                'summary': {
                    'total_deliveries': 0,
                    'avg_cost': 0,
                    'total_fuel': 0,
                    'total_electricity': 0,
                    'total_maintenance': 0
                }
            })

        # Validate data structure
        if not all(isinstance(row, list) and len(row) == 5 for row in deliveries):
            logger.error("Invalid data structure: Each delivery must be a list with 5 columns")
            return jsonify({
                'status': 'error',
                'message': 'Each delivery must have 5 columns: Time Taken, Cost, Fuel, Electricity, Maintenance',
                'bar_chart': '<p>Error: Invalid data format</p>',
                'line_chart': '<p>Error: Invalid data format</p>',
                'summary': {
                    'total_deliveries': 0,
                    'avg_cost': 0,
                    'total_fuel': 0,
                    'total_electricity': 0,
                    'total_maintenance': 0
                }
            }), 400

        # Create DataFrame
        columns = ['Time Taken (mins)', 'Cost per Delivery ($)', 'Fuel Consumption (L)', 'Electricity Consumption (kWh)', 'Maintenance Cost ($)']
        try:
            df = pd.DataFrame(deliveries, columns=columns)
            logger.debug(f"DataFrame created:\n{df.head().to_string()}")
        except Exception as e:
            logger.error(f"Failed to create DataFrame: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid data format: {str(e)}',
                'bar_chart': '<p>Error: Invalid data</p>',
                'line_chart': '<p>Error: Invalid data</p>',
                'summary': {
                    'total_deliveries': 0,
                    'avg_cost': 0,
                    'total_fuel': 0,
                    'total_electricity': 0,
                    'total_maintenance': 0
                }
            }), 400

        # Convert to numeric, handling errors
        try:
            df = df.astype({
                'Time Taken (mins)': float,
                'Cost per Delivery ($)': float,
                'Fuel Consumption (L)': float,
                'Electricity Consumption (kWh)': float,
                'Maintenance Cost ($)': float
            }, errors='coerce').fillna(0)
            logger.debug(f"DataFrame after type conversion:\n{df.head().to_string()}")
        except Exception as e:
            logger.error(f"Type conversion failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid numeric data: {str(e)}',
                'bar_chart': '<p>Error: Invalid numeric data</p>',
                'line_chart': '<p>Error: Invalid numeric data</p>',
                'summary': {
                    'total_deliveries': 0,
                    'avg_cost': 0,
                    'total_fuel': 0,
                    'total_electricity': 0,
                    'total_maintenance': 0
                }
            }), 400

        # Calculate summary stats
        total_deliveries = len(df)
        avg_cost = df['Cost per Delivery ($)'].mean() if total_deliveries > 0 else 0
        total_fuel = df['Fuel Consumption (L)'].sum()
        total_electricity = df['Electricity Consumption (kWh)'].sum()
        total_maintenance = df['Maintenance Cost ($)'].sum()
        logger.info(f"Summary stats: total_deliveries={total_deliveries}, avg_cost={avg_cost}, total_fuel={total_fuel}, total_electricity={total_electricity}, total_maintenance={total_maintenance}")

        # Check for plotting dependencies
        if sns is None or plt is None:
            logger.warning("Seaborn or Matplotlib not installed")
            return jsonify({
                'status': 'success',
                'bar_chart': '<p>Chart generation unavailable: Missing dependencies</p>',
                'line_chart': '<p>Chart generation unavailable: Missing dependencies</p>',
                'summary': {
                    'total_deliveries': total_deliveries,
                    'avg_cost': round(avg_cost, 2),
                    'total_fuel': round(total_fuel, 2),
                    'total_electricity': round(total_electricity, 2),
                    'total_maintenance': round(total_maintenance, 2)
                }
            })

        # Bar chart: Cost by Time Taken
        bar_html = '<p>Error generating bar chart</p>'
        try:
            df['Time Taken (mins)'] = df['Time Taken (mins)'].astype(str)
            time_summary = df.groupby('Time Taken (mins)')['Cost per Delivery ($)'].sum().reset_index()
            logger.debug(f"Time summary for bar chart:\n{time_summary.to_string()}")

            if time_summary.empty or time_summary['Cost per Delivery ($)'].isna().any() or (time_summary['Cost per Delivery ($)'] == 0).all():
                logger.warning("No valid cost data for bar chart")
                bar_html = '<p>No valid cost data for bar chart</p>'
            else:
                plt.figure(figsize=(6, 4))
                sns.set_style("whitegrid")
                sns.barplot(data=time_summary, x='Time Taken (mins)', y='Cost per Delivery ($)', color='#FF9800')
                plt.title('Cost by Time Taken')
                plt.ylabel('Cost per Delivery ($)')
                plt.xlabel('Time Taken (mins)')
                plt.xticks(rotation=45)
                plt.tight_layout()

                bar_buffer = BytesIO()
                plt.savefig(bar_buffer, format='png', bbox_inches='tight')
                bar_buffer.seek(0)
                bar_image = base64.b64encode(bar_buffer.getvalue()).decode('utf-8')
                bar_html = f'<img src="data:image/png;base64,{bar_image}" alt="Cost by Time Taken" style="width:100%;max-width:600px;">'
                plt.close()
                logger.info("Bar chart generated, base64 length: %d", len(bar_image))
        except Exception as e:
            logger.error(f"Error generating bar chart: {str(e)}")
            bar_html = f'<p>Error generating bar chart: {str(e)}</p>'

        # Line chart: Metrics Over Time Taken
        line_html = '<p>Error generating line chart</p>'
        try:
            plt.figure(figsize=(6, 4))
            sns.set_style("whitegrid")
            sns.lineplot(data=df, x='Time Taken (mins)', y='Cost per Delivery ($)', label='Cost ($)', color='#FF9800', marker='o')
            sns.lineplot(data=df, x='Time Taken (mins)', y='Fuel Consumption (L)', label='Fuel (L)', color='#4CAF50', marker='o')
            sns.lineplot(data=df, x='Time Taken (mins)', y='Electricity Consumption (kWh)', label='Electricity (kWh)', color='#2196F3', marker='o')
            sns.lineplot(data=df, x='Time Taken (mins)', y='Maintenance Cost ($)', label='Maintenance ($)', color='#9C27B0', marker='o')
            plt.title('Metrics Over Time Taken')
            plt.ylabel('Value')
            plt.xlabel('Time Taken (mins)')
            plt.xticks(rotation=45)
            plt.legend()
            plt.tight_layout()

            line_buffer = BytesIO()
            plt.savefig(line_buffer, format='png', bbox_inches='tight')
            line_buffer.seek(0)
            line_image = base64.b64encode(line_buffer.getvalue()).decode('utf-8')
            line_html = f'<img src="data:image/png;base64,{line_image}" alt="Metrics Over Time Taken" style="width:100%;max-width:600px;">'
            plt.close()
            logger.info("Line chart generated, base64 length: %d", len(line_image))
        except Exception as e:
            logger.error(f"Error generating line chart: {str(e)}")
            line_html = f'<p>Error generating line chart: {str(e)}</p>'

        return jsonify({
            'status': 'success',
            'bar_chart': bar_html,
            'line_chart': line_html,
            'summary': {
                'total_deliveries': total_deliveries,
                'avg_cost': round(avg_cost, 2),
                'total_fuel': round(total_fuel, 2),
                'total_electricity': round(total_electricity, 2),
                'total_maintenance': round(total_maintenance, 2)
            }
        })

    except Exception as e:
        logger.error(f"Unexpected error in generate_graphs: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Internal server error: {str(e)}',
            'bar_chart': f'<p>Error: {str(e)}</p>',
            'line_chart': f'<p>Error: {str(e)}</p>',
            'summary': {
                'total_deliveries': 0,
                'avg_cost': 0,
                'total_fuel': 0,
                'total_electricity': 0,
                'total_maintenance': 0
            }
        }), 500

if __name__ == '__main__':
    logger.info("Starting Flask app on port 5000...")
    app.run(debug=True, port=5000, host='0.0.0.0')