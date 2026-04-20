import React, { useState } from 'react';
import './PatientCard.css';

const imgHeartRateIcon = "https://www.figma.com/api/mcp/asset/c0f6a1f5-d660-41d5-b422-dc276f4b3fcc";
const imgSpO2Icon = "https://www.figma.com/api/mcp/asset/46fa4fac-2624-4f72-a58a-2ab4bf1cb3b4";
const imgBPTrendIcon = "https://www.figma.com/api/mcp/asset/222080f5-f4bd-42aa-815d-8b2bb850d25b";
const imgTempIcon = "https://www.figma.com/api/mcp/asset/d2c19a76-1e97-46ff-9ecb-c1d856b8113b";
const imgArrowDown = "https://www.figma.com/api/mcp/asset/29cd53b3-dd38-4f06-a62d-bea2d2002b5c";
const imgHRChart = "https://www.figma.com/api/mcp/asset/c22eaaf1-3f53-4d2b-be3f-f1708bf8ac23";
const imgSpO2Chart = "https://www.figma.com/api/mcp/asset/fe9f9f31-2b02-469f-852d-2117ecd71704";

export default function PatientCard({ patient }) {
  const [expandedWarnings, setExpandedWarnings] = useState(false);

  return (
    <div className="patient-card" data-node-id="888:4940">
      {/* Left Section - Patient Info */}
      <div className="patient-info-section" data-node-id="888:4941">
        <div className="patient-header-info" data-node-id="888:4942">
          <p className="patient-name" data-node-id="888:4943">{patient.name}</p>
          <p className="patient-id" data-node-id="888:4944">Id:{patient.id}</p>
          <p className="patient-record" data-node-id="888:4945">R.No: {patient.recordNo}</p>
        </div>
        <div className="divider-line" data-node-id="888:4946"></div>
        <button className="flag-doctor-btn" data-node-id="888:4947">
          Flag Doctor
        </button>
      </div>

      {/* Vertical Divider */}
      <div className="vertical-divider" data-node-id="888:4949"></div>

      {/* Middle Section - Vital Signs */}
      <div className="vitals-section" data-node-id="888:4950">
        <div className="vitals-row" data-node-id="888:4951">
          {/* Heart Rate */}
          <div className="vital-metric heart-rate" data-node-id="888:4952">
            <div className="metric-overlay" data-node-id="888:4953"></div>
            <div className="metric-content" data-node-id="888:4958">
              <div className="metric-header" data-node-id="888:4959">
                <div className="metric-icon" style={{ backgroundImage: "linear-gradient(135deg, rgb(99, 233, 132) 0%, rgb(29, 201, 72) 49.519%, rgb(99, 233, 132) 100%)" }} data-node-id="888:4960">
                  <img alt="heart-rate" className="icon-img" src={imgHeartRateIcon} data-node-id="888:4961" />
                </div>
                <p className="metric-label" data-node-id="888:4965">Heart Rate</p>
              </div>
              <div className="metric-value" data-node-id="888:4966">
                <p className="value" data-node-id="888:4967">{patient.vitals.heartRate.value}</p>
                <p className="unit" data-node-id="888:4968">{patient.vitals.heartRate.unit}</p>
              </div>
            </div>
          </div>

          {/* SpO2 */}
          <div className="vital-metric spo2" data-node-id="888:4969">
            <div className="metric-overlay" data-node-id="888:4970"></div>
            <div className="metric-content" data-node-id="888:4974">
              <div className="metric-header" data-node-id="888:4975">
                <div className="metric-icon" style={{ backgroundImage: "linear-gradient(135deg, rgb(182, 134, 249) 0%, rgb(152, 85, 247) 50.481%, rgb(182, 134, 249) 100%)" }} data-node-id="888:4976">
                  <img alt="spo2" className="icon-img" src={imgSpO2Icon} data-node-id="888:4977" />
                </div>
                <p className="metric-label" data-node-id="888:4979">SpO₂</p>
              </div>
              <div className="metric-value" data-node-id="888:4980">
                <p className="value" data-node-id="888:4981">{patient.vitals.spO2.value}%</p>
              </div>
            </div>
          </div>

          {/* BP Trend */}
          <div className="vital-metric bp-trend" data-node-id="888:4982">
            <div className="metric-content" data-node-id="888:4983">
              <div className="metric-header" data-node-id="888:4984">
                <div className="metric-icon" style={{ backgroundImage: "linear-gradient(135deg, rgb(255, 128, 181) 0%, rgb(255, 77, 151) 49.519%, rgb(255, 128, 181) 100%)" }} data-node-id="888:4985">
                  <img alt="bp-trend" className="icon-img" src={imgBPTrendIcon} data-node-id="888:4986" />
                </div>
                <p className="metric-label" data-node-id="888:4988">BP Trend</p>
              </div>
              <div className="metric-value" data-node-id="888:4989">
                <p className="value" data-node-id="888:4990">
                  <span className="bp-systolic">{patient.vitals.bpTrend.value}</span>
                  <span className="bp-slash">/80</span>
                </p>
                <p className="unit" data-node-id="888:4991">mmHg</p>
              </div>
            </div>
            <div className="bp-chart" data-node-id="888:4992">
              {[...Array(27)].map((_, i) => (
                <div
                  key={i}
                  className={`chart-bar ${i < 20 ? 'bar-gold' : 'bar-light'}`}
                  style={{
                    height: `${20 + Math.random() * 15}px`,
                    left: `${i * 4.5}px`
                  }}
                  data-node-id={`888:${4993 + i}`}
                ></div>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="vital-metric temperature" data-node-id="888:5027">
            <div className="metric-content" data-node-id="888:5028">
              <div className="metric-header" data-node-id="888:5029">
                <div className="metric-icon" style={{ backgroundImage: "linear-gradient(135deg, rgb(153, 208, 255) 0%, rgb(102, 184, 255) 49.519%, rgb(153, 208, 255) 100%)" }} data-node-id="888:5030">
                  <img alt="temp" className="icon-img" src={imgTempIcon} data-node-id="888:5031" />
                </div>
                <p className="metric-label" data-node-id="888:5035">Temp</p>
              </div>
              <div className="metric-value" data-node-id="888:5036">
                <p className="value" data-node-id="888:5037">{patient.vitals.temp.value}</p>
                <p className="unit" data-node-id="888:5038">°C</p>
              </div>
            </div>
            <div className="temp-chart" data-node-id="888:5039"></div>
            <div className="temp-chart light" data-node-id="888:5040"></div>
            <div className="chart-indicator" data-node-id="888:5041"></div>
          </div>
        </div>
      </div>

      {/* Right Section - Status and Actions */}
      <div className="status-section" data-node-id="888:5044">
        <div className="status-content" data-node-id="888:5045">
          <div className="status-row" data-node-id="888:5046">
            <p className="status-label" data-node-id="888:5047">Status</p>
            <div className="status-badge connected" data-node-id="888:5048">
              <p className="status-text" data-node-id="888:5049">{patient.status}</p>
            </div>
          </div>
          <div className="battery-row" data-node-id="888:5050">
            <p className="battery-label" data-node-id="888:5051">Battery</p>
            <div className="battery-badge" data-node-id="888:5052">
              <p className="battery-emoji" data-node-id="888:5053">🔋</p>
              <p className="battery-value" data-node-id="888:5054">{patient.battery}%</p>
            </div>
          </div>
        </div>
        <button
          className="expand-btn"
          onClick={() => setExpandedWarnings(!expandedWarnings)}
          data-node-id="888:5055"
        >
          <div className="arrow-icon" data-node-id="888:5056">
            <img alt="arrow" src={imgArrowDown} style={{ transform: expandedWarnings ? 'scaleY(-1)' : 'scaleY(1)' }} />
          </div>
        </button>

        {expandedWarnings && (
          <div className="warnings-section">
            <div className="warnings-grid">
              {patient.warnings.map((warning, idx) => (
                <div key={idx} className={`warning-item severity-${warning.severity}`}>
                  <span className="warning-label">{warning.label}</span>
                  {warning.value && <span className="warning-value">{warning.value}</span>}
                </div>
              ))}
            </div>
            <button className="take-action-btn">Take Action</button>
          </div>
        )}
      </div>
    </div>
  );
}
