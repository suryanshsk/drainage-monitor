import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from tracking import (
    IncidentStatus,
    IncidentPriority,
    IncidentCategory,
    calculate_priority,
    is_valid_status_transition,
    build_incident_title,
    build_escalation_chain,
)


class TrackingCoreTests(unittest.TestCase):
    def test_calculate_priority_critical(self):
        result = calculate_priority(
            category=IncidentCategory.FLOOD_RISK,
            water_level=92,
            methane=25,
            h2s=14,
            duration_minutes=8,
            affected_nodes=2,
            communication_loss=0,
            risk_score=0.9,
        )
        self.assertEqual(result, IncidentPriority.CRITICAL)

    def test_calculate_priority_medium(self):
        result = calculate_priority(
            category=IncidentCategory.BLOCKAGE,
            water_level=50,
            methane=5,
            h2s=2,
            duration_minutes=10,
            affected_nodes=1,
            communication_loss=0,
            risk_score=0.3,
        )
        self.assertEqual(result, IncidentPriority.MEDIUM)

    def test_status_transition_allowed(self):
        self.assertTrue(is_valid_status_transition(IncidentStatus.DETECTED, IncidentStatus.TRIAGED))
        self.assertTrue(is_valid_status_transition(IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED))
        self.assertFalse(is_valid_status_transition(IncidentStatus.CLOSED, IncidentStatus.DETECTED))

    def test_incident_title_builds_from_context(self):
        title = build_incident_title(IncidentCategory.BLOCKAGE, "Node 3")
        self.assertIn("Blockage", title)
        self.assertIn("Node 3", title)

    def test_escalation_chain_routes_to_ministry_chain(self):
        chain = build_escalation_chain(IncidentCategory.FLOOD_RISK, IncidentPriority.CRITICAL)
        ministries = [step["ministry"] for step in chain]
        self.assertIn("Municipal Drainage Operations", ministries)
        self.assertIn("State Urban Water Department", ministries)
        self.assertIn("Ministry of Jal Shakti", ministries)


if __name__ == "__main__":
    unittest.main()
